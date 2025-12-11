#!/bin/bash
# DeepStack Health Check Script
# Run: ./scripts/health-check.sh

echo "========================================"
echo "  DeepStack Health Check"
echo "  $(date)"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Endpoints
FRONTEND_URL="https://deepstack.trade"
BACKEND_URL="https://deepstack-api-production.up.railway.app"

check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$status" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $name: $status"
        return 0
    elif [ "$status" == "000" ]; then
        echo -e "${RED}✗${NC} $name: TIMEOUT/UNREACHABLE"
        return 1
    else
        echo -e "${YELLOW}!${NC} $name: $status (expected $expected_status)"
        return 1
    fi
}

check_json_health() {
    local name=$1
    local url=$2

    response=$(curl -s --max-time 10 "$url" 2>/dev/null || echo '{"status":"error"}')
    status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "error")

    if [ "$status" == "healthy" ]; then
        echo -e "${GREEN}✓${NC} $name: healthy"
        return 0
    else
        echo -e "${RED}✗${NC} $name: $status"
        return 1
    fi
}

check_api_responding() {
    local name=$1
    local url=$2

    # Check if API responds with valid JSON (even error responses)
    response=$(curl -s --max-time 10 "$url" 2>/dev/null)

    if echo "$response" | jq . >/dev/null 2>&1; then
        # Valid JSON - API is responding
        has_error=$(echo "$response" | jq -r '.error // .success' 2>/dev/null)
        if [ "$has_error" == "false" ] || [ ! -z "$(echo "$response" | jq -r '.error' 2>/dev/null)" ]; then
            echo -e "${YELLOW}!${NC} $name: responding (data unavailable - market may be closed)"
            return 0
        else
            echo -e "${GREEN}✓${NC} $name: responding with data"
            return 0
        fi
    else
        echo -e "${RED}✗${NC} $name: not responding"
        return 1
    fi
}

echo "1. Frontend (Vercel)"
echo "-------------------"
check_endpoint "Website" "$FRONTEND_URL"
echo ""

echo "2. Backend API (Railway)"
echo "------------------------"
check_json_health "Health Endpoint" "$BACKEND_URL/health"
check_api_responding "Quote API" "$BACKEND_URL/quote/SPY"
check_api_responding "Bars API" "$BACKEND_URL/api/market/bars?symbol=SPY&timeframe=1D&limit=1"
echo ""

echo "3. Response Times"
echo "-----------------"
printf "  %-20s %s\n" "Endpoint" "Time"
printf "  %-20s %s\n" "--------" "----"
for endpoint in "health" "quote/SPY"; do
    time=$(curl -s -o /dev/null -w "%{time_total}" "$BACKEND_URL/$endpoint" 2>/dev/null || echo "N/A")
    printf "  %-20s %ss\n" "$endpoint" "$time"
done
echo ""

echo "4. Market Hours Check"
echo "---------------------"
day=$(date +%u)
hour=$(date +%H)
if [ $day -ge 6 ]; then
    echo -e "${YELLOW}!${NC} Weekend - Markets closed"
elif [ $hour -lt 9 ] || [ $hour -ge 16 ]; then
    echo -e "${YELLOW}!${NC} Outside market hours (9:30 AM - 4:00 PM ET)"
else
    echo -e "${GREEN}✓${NC} Market hours - data should be live"
fi
echo ""

echo "========================================"
echo "  Summary"
echo "========================================"
echo "Run this script anytime: ./scripts/health-check.sh"
echo "Set up UptimeRobot for 24/7 monitoring"
echo ""
