#!/bin/bash

##############################################################################
# WebWright Desktop Auto-Start Script
#
# This script automatically starts all 3 required processes:
# 1. WebWright Daemon (browser automation backend)
# 2. HTTP Bridge (translates HTTP → Unix socket)
# 3. Electron App (desktop UI)
#
# Usage: ./start.sh
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# PID file locations
DAEMON_PID_FILE="./.daemon.pid"
BRIDGE_PID_FILE="./.bridge.pid"
ELECTRON_PID_FILE="./.electron.pid"

##############################################################################
# Cleanup function
##############################################################################

cleanup() {
  echo -e "\n${YELLOW}Shutting down WebWright Desktop...${NC}"

  # Kill Electron
  if [ -f "$ELECTRON_PID_FILE" ]; then
    ELECTRON_PID=$(cat "$ELECTRON_PID_FILE")
    if kill -0 "$ELECTRON_PID" 2>/dev/null; then
      echo -e "${BLUE}Stopping Electron app...${NC}"
      kill "$ELECTRON_PID" 2>/dev/null || true
    fi
    rm -f "$ELECTRON_PID_FILE"
  fi

  # Kill HTTP Bridge
  if [ -f "$BRIDGE_PID_FILE" ]; then
    BRIDGE_PID=$(cat "$BRIDGE_PID_FILE")
    if kill -0 "$BRIDGE_PID" 2>/dev/null; then
      echo -e "${BLUE}Stopping HTTP Bridge...${NC}"
      kill "$BRIDGE_PID" 2>/dev/null || true
    fi
    rm -f "$BRIDGE_PID_FILE"
  fi

  # Kill WebWright Daemon
  if [ -f "$DAEMON_PID_FILE" ]; then
    DAEMON_PID=$(cat "$DAEMON_PID_FILE")
    if kill -0 "$DAEMON_PID" 2>/dev/null; then
      echo -e "${BLUE}Stopping WebWright daemon...${NC}"
      kill "$DAEMON_PID" 2>/dev/null || true
    fi
    rm -f "$DAEMON_PID_FILE"
  fi

  echo -e "${GREEN}✓ All processes stopped${NC}"
  exit 0
}

# Set up cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

##############################################################################
# Check prerequisites
##############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WebWright Desktop Auto-Start                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}\n"

# Check if WebWright is installed
if ! command -v webwright &> /dev/null && ! command -v npx &> /dev/null; then
  echo -e "${RED}✗ Error: WebWright not found${NC}"
  echo -e "  Install with: ${YELLOW}npm install -g webwright${NC}"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

##############################################################################
# Start WebWright Daemon
##############################################################################

echo -e "${BLUE}[1/3] Starting WebWright Daemon...${NC}"

# Check if webwright command exists
if command -v webwright &> /dev/null; then
  WEBWRIGHT_CMD="webwright"
else
  WEBWRIGHT_CMD="npx webwright"
fi

# Start daemon in background
nohup $WEBWRIGHT_CMD daemon > ./daemon.log 2>&1 &
DAEMON_PID=$!
echo $DAEMON_PID > "$DAEMON_PID_FILE"

# Wait for daemon to start
echo -e "${YELLOW}  Waiting for daemon to initialize...${NC}"
sleep 3

# Check if daemon is running
if kill -0 "$DAEMON_PID" 2>/dev/null; then
  echo -e "${GREEN}  ✓ Daemon started (PID: $DAEMON_PID)${NC}"
else
  echo -e "${RED}  ✗ Daemon failed to start${NC}"
  echo -e "  Check daemon.log for errors"
  exit 1
fi

##############################################################################
# Start HTTP Bridge
##############################################################################

echo -e "${BLUE}[2/3] Starting HTTP Bridge...${NC}"

# Start HTTP bridge in background
nohup node webwright-http-bridge.js > ./bridge.log 2>&1 &
BRIDGE_PID=$!
echo $BRIDGE_PID > "$BRIDGE_PID_FILE"

# Wait for bridge to start
echo -e "${YELLOW}  Waiting for bridge to initialize...${NC}"
sleep 2

# Check if bridge is running
if kill -0 "$BRIDGE_PID" 2>/dev/null; then
  # Check if port 3456 is open
  if lsof -Pi :3456 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓ HTTP Bridge started (PID: $BRIDGE_PID)${NC}"
  else
    echo -e "${RED}  ✗ Bridge started but port 3456 not listening${NC}"
    echo -e "  Check bridge.log for errors"
    exit 1
  fi
else
  echo -e "${RED}  ✗ HTTP Bridge failed to start${NC}"
  echo -e "  Check bridge.log for errors"
  exit 1
fi

##############################################################################
# Start Electron App
##############################################################################

echo -e "${BLUE}[3/3] Starting Electron App...${NC}"

# Start electron in background
nohup npm run electron:dev > ./electron.log 2>&1 &
ELECTRON_PID=$!
echo $ELECTRON_PID > "$ELECTRON_PID_FILE"

echo -e "${YELLOW}  Waiting for Electron to initialize...${NC}"
sleep 5

# Check if electron is running
if kill -0 "$ELECTRON_PID" 2>/dev/null; then
  echo -e "${GREEN}  ✓ Electron app started (PID: $ELECTRON_PID)${NC}"
else
  echo -e "${RED}  ✗ Electron app failed to start${NC}"
  echo -e "  Check electron.log for errors"
  exit 1
fi

##############################################################################
# Success!
##############################################################################

echo -e "\n${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  WebWright Desktop is now running!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Process Status:${NC}"
echo -e "  • WebWright Daemon: ${GREEN}Running${NC} (PID: $DAEMON_PID)"
echo -e "  • HTTP Bridge:      ${GREEN}Running${NC} (PID: $BRIDGE_PID, port 3456)"
echo -e "  • Electron App:     ${GREEN}Running${NC} (PID: $ELECTRON_PID)"

echo -e "\n${BLUE}Logs:${NC}"
echo -e "  • Daemon:   ${YELLOW}tail -f daemon.log${NC}"
echo -e "  • Bridge:   ${YELLOW}tail -f bridge.log${NC}"
echo -e "  • Electron: ${YELLOW}tail -f electron.log${NC}"

echo -e "\n${BLUE}To stop:${NC} Press ${YELLOW}Ctrl+C${NC}\n"

# Keep script running and wait for signals
echo -e "${YELLOW}Monitoring processes... (Ctrl+C to stop all)${NC}\n"

while true; do
  # Check if all processes are still running
  if ! kill -0 "$DAEMON_PID" 2>/dev/null; then
    echo -e "${RED}✗ WebWright Daemon stopped unexpectedly${NC}"
    break
  fi
  if ! kill -0 "$BRIDGE_PID" 2>/dev/null; then
    echo -e "${RED}✗ HTTP Bridge stopped unexpectedly${NC}"
    break
  fi
  if ! kill -0 "$ELECTRON_PID" 2>/dev/null; then
    echo -e "${RED}✗ Electron App stopped unexpectedly${NC}"
    break
  fi

  sleep 5
done

# Cleanup will be called automatically by trap
