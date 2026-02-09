#!/bin/bash
#
# DeepStack Voice — Telegram Listener Daemon
#
# Long-polling Telegram bot that provides conversational access to the
# DeepStack trading system. Cloned from HYDRA's telegram-listener.sh.
#
# Usage:
#   ./deepstack-voice-listener.sh          # Run in foreground
#   launchctl load com.deepstack.voice-listener.plist  # Run as daemon
#
# Environment: deepstack-voice.env (auto-loaded)
#

set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/deepstack-voice.env"

# State
STATE_DIR="$PROJECT_ROOT/data/voice-state"
OFFSET_FILE="$STATE_DIR/telegram-offset.txt"
LOCK_DIR="$STATE_DIR/listener.lockdir"
CONFLICT_FILE="$STATE_DIR/telegram-conflict.txt"

# Logs
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/voice-listener.log"

# Python scripts
BRAIN_SCRIPT="$PROJECT_ROOT/scripts/voice/deepstack_context.py"

# Voice temp dir
VOICE_TEMP="/tmp/deepstack-voice"

# ── Initialization ─────────────────────────────────────────────────

mkdir -p "$STATE_DIR" "$LOG_DIR" "$VOICE_TEMP"

# Load environment
if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value; do
        key=$(echo "$key" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
        [[ -z "$key" || "$key" == \#* ]] && continue
        value=$(echo "$value" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
        export "$key=$value"
    done < "$ENV_FILE"
else
    echo "ERROR: Environment file not found: $ENV_FILE" | tee -a "$LOG_FILE"
    exit 1
fi

# Validate required env vars
for var in TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID ANTHROPIC_API_KEY; do
    if [[ -z "${!var:-}" ]]; then
        echo "ERROR: Required env var $var is not set" | tee -a "$LOG_FILE"
        exit 1
    fi
done

TELEGRAM_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

# ── Logging ────────────────────────────────────────────────────────

log() {
    local level="${1:-INFO}"
    shift
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $*" >> "$LOG_FILE"
    echo "$(date '+%H:%M:%S') [$level] $*"
}

# ── Lock File (atomic via mkdir) ───────────────────────────────────

acquire_lock() {
    if mkdir "$LOCK_DIR" 2>/dev/null; then
        if ! echo $$ > "$LOCK_DIR/pid" 2>/dev/null; then
            log ERROR "Failed to write lock PID file"
            rm -rf "$LOCK_DIR"
            return 1
        fi
        log INFO "Lock acquired (PID: $$)"
        return 0
    fi

    # Check if existing lock holder is still alive
    local old_pid
    old_pid=$(cat "$LOCK_DIR/pid" 2>/dev/null || echo "")
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
        log ERROR "Another listener is running (PID: $old_pid)"
        return 1
    fi

    # Stale lock — reclaim
    log WARN "Removing stale lock (old PID: $old_pid)"
    rm -rf "$LOCK_DIR"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
        if ! echo $$ > "$LOCK_DIR/pid" 2>/dev/null; then
            log ERROR "Failed to write lock PID file"
            rm -rf "$LOCK_DIR"
            return 1
        fi
        log INFO "Lock reclaimed (PID: $$)"
        return 0
    fi

    log ERROR "Failed to acquire lock"
    return 1
}

release_lock() {
    rm -rf "$LOCK_DIR"
    log INFO "Lock released"
}

# ── Graceful Shutdown ──────────────────────────────────────────────

RUNNING=true

shutdown_handler() {
    log INFO "Shutdown signal received"
    RUNNING=false
    release_lock
    # Clean up temp files
    rm -rf "$VOICE_TEMP"/*
    exit 0
}

trap shutdown_handler SIGTERM SIGINT SIGHUP

# ── Telegram API Helpers ───────────────────────────────────────────

# Token-safe curl: pass URL via stdin config to avoid ps exposure
telegram_curl() {
    local endpoint="$1"
    shift
    local url="${TELEGRAM_API}/${endpoint}"
    printf 'url = "%s"\n' "$url" | curl --config - -s "$@"
}

send_message() {
    local chat_id="$1"
    local text="$2"
    local reply_to="${3:-}"

    # Truncate to Telegram limit
    if [[ ${#text} -gt 4000 ]]; then
        text="${text:0:3997}..."
    fi

    # Convert markdown to Telegram HTML
    local html_text
    html_text=$(python3 -c "
import sys, re
t = sys.stdin.read()
# Bold: **text** -> <b>text</b>
t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
# Code: \`text\` -> <code>text</code>
t = re.sub(r'\`\`\`(.+?)\`\`\`', r'<pre>\1</pre>', t, flags=re.DOTALL)
t = re.sub(r'\`(.+?)\`', r'<code>\1</code>', t)
# Headers: # text -> <b>text</b>
t = re.sub(r'^#+\s+(.+)$', r'<b>\1</b>', t, flags=re.MULTILINE)
# Escape remaining HTML entities (but not our tags)
print(t)
" <<< "$text" 2>/dev/null || echo "$text")

    local json_payload
    json_payload=$(python3 -c "
import json, sys
text = sys.stdin.read()
payload = {'chat_id': '$chat_id', 'text': text, 'parse_mode': 'HTML'}
reply = '$reply_to'
if reply:
    payload['reply_to_message_id'] = int(reply)
print(json.dumps(payload))
" <<< "$html_text" 2>/dev/null)

    if [[ -z "$json_payload" ]]; then
        log ERROR "Failed to build JSON payload for send_message"
        return 1
    fi

    telegram_curl "sendMessage" \
        -H "Content-Type: application/json" \
        -d "$json_payload" > /dev/null 2>&1
}

send_typing() {
    local chat_id="$1"
    telegram_curl "sendChatAction" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\":\"$chat_id\",\"action\":\"typing\"}" > /dev/null 2>&1
}

# ── Voice Pipeline ─────────────────────────────────────────────────

text_to_speech() {
    local text="$1"
    local output_file="$2"

    # Clean text for speech (strip markdown, code blocks, etc.)
    local clean_text
    clean_text=$(python3 -c "
import re, sys
t = sys.stdin.read()
t = re.sub(r'\*\*(.+?)\*\*', r'\1', t)
t = re.sub(r'\`\`\`.*?\`\`\`', '', t, flags=re.DOTALL)
t = re.sub(r'\`(.+?)\`', r'\1', t)
t = re.sub(r'<[^>]+>', '', t)
t = re.sub(r'#{1,6}\s+', '', t)
t = re.sub(r'\n{3,}', '\n\n', t)
t = t.strip()
if len(t) > 2000:
    t = t[:2000]
print(t)
" <<< "$text" 2>/dev/null)

    if [[ -z "$clean_text" || ${#clean_text} -lt 10 ]]; then
        log WARN "Text too short for TTS, skipping"
        return 1
    fi

    local mp3_file="${output_file%.ogg}.mp3"

    # Try ElevenLabs first
    local elevenlabs_key="${ELEVENLABS_API_KEY:-}"
    local voice_id="${ELEVENLABS_VOICE_ID:-nPczCjzI2devNBz1zQrb}"

    if [[ -n "$elevenlabs_key" ]]; then
        local tts_payload
        tts_payload=$(python3 -c "
import json, sys
text = sys.stdin.read().strip()
print(json.dumps({
    'text': text,
    'model_id': 'eleven_turbo_v2_5',
    'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75}
}))
" <<< "$clean_text" 2>/dev/null)

        local http_code
        http_code=$(curl -s -w "%{http_code}" -o "$mp3_file" \
            "https://api.elevenlabs.io/v1/text-to-speech/$voice_id" \
            -H "xi-api-key: $elevenlabs_key" \
            -H "Content-Type: application/json" \
            -d "$tts_payload" 2>/dev/null)

        if [[ "$http_code" == "200" && -f "$mp3_file" && -s "$mp3_file" ]]; then
            # Convert MP3 to OGG/Opus for Telegram
            ffmpeg -y -i "$mp3_file" -c:a libopus -b:a 48k -application voip \
                "$output_file" > /dev/null 2>&1
            rm -f "$mp3_file"

            if [[ -f "$output_file" && -s "$output_file" ]]; then
                log INFO "ElevenLabs TTS success"
                return 0
            fi
        fi
        rm -f "$mp3_file"
        log WARN "ElevenLabs failed (HTTP $http_code), trying Deepgram fallback"
    fi

    # Fallback: Deepgram Aura
    local deepgram_key="${DEEPGRAM_API_KEY:-}"
    if [[ -n "$deepgram_key" ]]; then
        local dg_mp3="${output_file%.ogg}.dg.mp3"
        local http_code
        http_code=$(curl -s -w "%{http_code}" -o "$dg_mp3" \
            "https://api.deepgram.com/v1/speak?model=aura-orion-en" \
            -H "Authorization: Token $deepgram_key" \
            -H "Content-Type: application/json" \
            -d "{\"text\": $(python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))" <<< "$clean_text")}" 2>/dev/null)

        if [[ "$http_code" == "200" && -f "$dg_mp3" && -s "$dg_mp3" ]]; then
            ffmpeg -y -i "$dg_mp3" -c:a libopus -b:a 48k -application voip \
                "$output_file" > /dev/null 2>&1
            rm -f "$dg_mp3"

            if [[ -f "$output_file" && -s "$output_file" ]]; then
                log INFO "Deepgram TTS success (fallback)"
                return 0
            fi
        fi
        rm -f "$dg_mp3"
    fi

    log ERROR "All TTS providers failed"
    return 1
}

send_voice_note() {
    local voice_file="$1"
    local chat_id="$2"
    local reply_to="${3:-}"

    if [[ ! -f "$voice_file" || ! -s "$voice_file" ]]; then
        log WARN "Voice file missing or empty: $voice_file"
        return 1
    fi

    if [[ -n "$reply_to" ]]; then
        telegram_curl "sendVoice" \
            -F "chat_id=$chat_id" \
            -F "voice=@$voice_file" \
            -F "reply_to_message_id=$reply_to" > /dev/null 2>&1
    else
        telegram_curl "sendVoice" \
            -F "chat_id=$chat_id" \
            -F "voice=@$voice_file" > /dev/null 2>&1
    fi

    local result=$?
    rm -f "$voice_file"
    return $result
}

# ── Voice Transcription (incoming voice messages) ──────────────────

transcribe_voice() {
    local file_id="$1"

    local deepgram_key="${DEEPGRAM_API_KEY:-}"
    if [[ -z "$deepgram_key" ]]; then
        echo "Voice transcription not configured"
        return 1
    fi

    # Get file path from Telegram
    local file_info
    file_info=$(telegram_curl "getFile?file_id=$file_id" 2>/dev/null)
    local file_path
    file_path=$(echo "$file_info" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('result', {}).get('file_path', ''))
" 2>/dev/null)

    if [[ -z "$file_path" ]]; then
        echo "Could not get voice file from Telegram"
        return 1
    fi

    # Validate file_path (alphanumeric, slashes, dots, hyphens only)
    if [[ ! "$file_path" =~ ^[a-zA-Z0-9/_.\-]+$ ]]; then
        echo "Invalid file path from Telegram API"
        return 1
    fi

    # Download voice file (token-safe: pass URL via stdin config)
    local voice_dl="$VOICE_TEMP/incoming-$(date +%s)-$RANDOM.ogg"
    local dl_url="https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}"
    printf 'url = "%s"\n' "$dl_url" | curl --config - -s -o "$voice_dl" 2>/dev/null

    if [[ ! -f "$voice_dl" || ! -s "$voice_dl" ]]; then
        echo "Failed to download voice file"
        return 1
    fi

    # Transcribe via Deepgram Nova-2
    local transcript
    transcript=$(curl -s \
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true" \
        -H "Authorization: Token $deepgram_key" \
        -H "Content-Type: audio/ogg" \
        --data-binary "@$voice_dl" 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
alts = data.get('results', {}).get('channels', [{}])[0].get('alternatives', [])
print(alts[0].get('transcript', '') if alts else '')
" 2>/dev/null)

    rm -f "$voice_dl"

    if [[ -n "$transcript" ]]; then
        echo "$transcript"
        return 0
    fi

    echo "Could not transcribe voice message"
    return 1
}

# ── Message Processing ─────────────────────────────────────────────

process_message() {
    local chat_id="$1"
    local message_id="$2"
    local text="$3"
    local is_voice="${4:-false}"

    log INFO "Processing: '$text' (voice: $is_voice)"

    # Send typing indicator
    send_typing "$chat_id"

    # Get brain response (Python handles intent classification + context + Claude call)
    local response
    response=$(python3 "$BRAIN_SCRIPT" "$text" 2>> "$LOG_FILE")

    if [[ -z "$response" ]]; then
        response="I couldn't process that. Try rephrasing your question."
    fi

    # Send text response immediately
    send_message "$chat_id" "$response" "$message_id"
    log INFO "Text response sent (${#response} chars)"

    # Async: generate and send voice note (non-blocking)
    (
        local voice_file="$VOICE_TEMP/response-$(date +%s)-$$-$RANDOM.ogg"
        if text_to_speech "$response" "$voice_file"; then
            send_voice_note "$voice_file" "$chat_id" "$message_id"
            log INFO "Voice note sent"
        else
            log WARN "Voice note generation failed (text-only response)"
        fi
    ) &
}

# ── Main Polling Loop ──────────────────────────────────────────────

main() {
    log INFO "=========================================="
    log INFO "DeepStack Voice Listener starting"
    log INFO "Bot token: ${TELEGRAM_BOT_TOKEN:0:10}..."
    log INFO "Chat ID: $TELEGRAM_CHAT_ID"
    log INFO "Project: $PROJECT_ROOT"
    log INFO "=========================================="

    # Acquire lock
    if ! acquire_lock; then
        log ERROR "Could not acquire lock. Exiting."
        exit 1
    fi

    # Load last offset
    local offset=0
    if [[ -f "$OFFSET_FILE" ]]; then
        offset=$(cat "$OFFSET_FILE" 2>/dev/null || echo "0")
    fi
    log INFO "Starting from offset: $offset"

    # Error tracking
    local consecutive_errors=0
    local current_backoff=0

    while $RUNNING; do
        # Long poll for updates
        local response
        response=$(telegram_curl "getUpdates?offset=${offset}&timeout=30" 2>/dev/null) || {
            ((consecutive_errors++))
            if [[ $current_backoff -eq 0 ]]; then
                current_backoff=5
            else
                current_backoff=$((current_backoff * 2))
            fi
            if [[ $current_backoff -gt 300 ]]; then
                current_backoff=300
            fi
            log WARN "Poll failed (error #$consecutive_errors), backing off ${current_backoff}s"
            sleep "$current_backoff"
            continue
        }

        # Reset backoff on success
        consecutive_errors=0
        current_backoff=0

        # Check for 409 conflict (another consumer)
        if echo "$response" | grep -q '"error_code":409'; then
            log ERROR "409 Conflict: another bot instance is polling"
            echo "conflict_detected=$(date +%s)" > "$CONFLICT_FILE"
            release_lock
            exit 1
        fi

        # Parse updates
        local tmpdir
        tmpdir=$(mktemp -d)
        echo "$response" > "$tmpdir/response.json"

        local update_count
        update_count=$(python3 -c "
import json
with open('$tmpdir/response.json') as f:
    data = json.load(f)
updates = data.get('result', [])
print(len(updates))
for i, u in enumerate(updates):
    with open(f'$tmpdir/update_{i}.json', 'w') as out:
        json.dump(u, out)
" 2>/dev/null || echo "0")

        if [[ "$update_count" == "0" || -z "$update_count" ]]; then
            rm -rf "$tmpdir"
            continue
        fi

        log INFO "Received $update_count update(s)"

        # Process each update
        local i=0
        while [[ $i -lt $update_count ]]; do
            local update_file="$tmpdir/update_${i}.json"
            if [[ ! -f "$update_file" ]]; then
                ((i++))
                continue
            fi

            # Extract fields safely (no eval — write to temp file, read back)
            local fields_file="$tmpdir/fields_${i}.json"
            python3 -c "
import json
with open('$update_file') as f:
    u = json.load(f)
msg = u.get('message', {})
fields = {
    'update_id': u.get('update_id', 0),
    'chat_id': str(msg.get('chat', {}).get('id', '')),
    'message_id': str(msg.get('message_id', '')),
    'text': msg.get('text', ''),
    'voice_file_id': msg.get('voice', {}).get('file_id', ''),
}
with open('$fields_file', 'w') as out:
    json.dump(fields, out)
" 2>/dev/null

            if [[ ! -f "$fields_file" ]]; then
                log WARN "Failed to parse update $i, skipping"
                ((i++))
                continue
            fi

            local update_id chat_id message_id text voice_file_id
            update_id=$(python3 -c "import json; print(json.load(open('$fields_file'))['update_id'])" 2>/dev/null || echo "0")
            chat_id=$(python3 -c "import json; print(json.load(open('$fields_file'))['chat_id'])" 2>/dev/null || echo "")
            message_id=$(python3 -c "import json; print(json.load(open('$fields_file'))['message_id'])" 2>/dev/null || echo "")
            text=$(python3 -c "import json; print(json.load(open('$fields_file'))['text'])" 2>/dev/null || echo "")
            voice_file_id=$(python3 -c "import json; print(json.load(open('$fields_file'))['voice_file_id'])" 2>/dev/null || echo "")

            # Update offset (atomic write via temp file)
            local new_offset=$((update_id + 1))
            if [[ $new_offset -gt $offset ]]; then
                offset=$new_offset
                echo "$offset" > "${OFFSET_FILE}.tmp" && mv "${OFFSET_FILE}.tmp" "$OFFSET_FILE"
            fi

            # Auth gate: only process messages from our chat
            if [[ "$chat_id" != "$TELEGRAM_CHAT_ID" ]]; then
                log WARN "Ignoring message from unauthorized chat: $chat_id"
                ((i++))
                continue
            fi

            # Handle voice messages
            if [[ -n "$voice_file_id" && "$voice_file_id" != "''" ]]; then
                log INFO "Voice message received, transcribing..."
                send_typing "$chat_id"
                text=$(transcribe_voice "$voice_file_id" 2>> "$LOG_FILE")
                if [[ -z "$text" || "$text" == "Could not"* ]]; then
                    send_message "$chat_id" "Couldn't transcribe your voice message. Try again or type your question." "$message_id"
                    ((i++))
                    continue
                fi
                log INFO "Transcribed: '$text'"
                process_message "$chat_id" "$message_id" "$text" "true"
            elif [[ -n "$text" && "$text" != "''" ]]; then
                # Handle text messages
                process_message "$chat_id" "$message_id" "$text" "false"
            fi

            ((i++))
        done

        rm -rf "$tmpdir"
    done

    release_lock
    log INFO "Listener stopped"
}

# ── Entry Point ────────────────────────────────────────────────────

main "$@"
