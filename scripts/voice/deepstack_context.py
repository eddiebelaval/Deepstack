#!/usr/bin/env python3
"""
DeepStack Voice — Context Entrypoint

Called by the Bash listener to process a user message and return a response.

Usage:
    python3 scripts/voice/deepstack_context.py "how's my portfolio?"
    python3 scripts/voice/deepstack_context.py --intent-only "check my balance"
    python3 scripts/voice/deepstack_context.py --context-only

Exit codes:
    0: Success (response on stdout)
    1: Error (error message on stderr)
"""

import json
import logging
import os
import sys

# Add project root to path
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, PROJECT_ROOT)

# Load environment from deepstack-voice.env
ENV_FILE = os.path.join(PROJECT_ROOT, "deepstack-voice.env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

# Set up logging to stderr (stdout is for the response)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("deepstack.voice.entry")


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: deepstack_context.py [--intent-only|--context-only] <message>",
            file=sys.stderr,
        )
        sys.exit(1)

    # Parse flags
    args = sys.argv[1:]

    if args[0] == "--context-only":
        # Just dump the live context (for debugging)
        from core.voice.context_gatherer import (
            format_context_for_prompt,
            gather_full_context,
        )

        ctx = gather_full_context()
        print(format_context_for_prompt(ctx))
        sys.exit(0)

    if args[0] == "--intent-only":
        # Just classify intent (for the listener's dispatch logic)
        message = " ".join(args[1:])
        from scripts.voice.deepstack_brain import classify_intent

        intent = classify_intent(message)
        print(json.dumps(intent))
        sys.exit(0)

    # Default: full brain response
    message = " ".join(args)

    from scripts.voice.deepstack_brain import ask_brain, classify_intent

    # Classify intent first
    intent = classify_intent(message)
    logger.info("Intent: %s (confidence: %s)", intent["type"], intent["confidence"])

    # Get brain response
    response = ask_brain(message, intent_type=intent["type"])

    # Output response to stdout (Bash listener captures this)
    print(response)


if __name__ == "__main__":
    main()
