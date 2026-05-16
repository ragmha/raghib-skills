#!/bin/bash
# Install Cat Gatekeeper as a system-level launchd agent (macOS).
# Fires every 30 min while the user is logged in, regardless of whether
# the Copilot CLI (or any specific app) is open.
#
# No external dependencies — pure bash + osascript + Terminal.app.

set -e
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/com.raghib.cat-gatekeeper.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.raghib.cat-gatekeeper.plist"

chmod +x "$(dirname "$0")"/*.sh

launchctl unload "$PLIST_DST" 2>/dev/null || true
cp "$PLIST_SRC" "$PLIST_DST"
launchctl load "$PLIST_DST"

echo "🐈 Cat Gatekeeper armed."
echo "   Fires every 30 min. Logs: /tmp/cat-gatekeeper.log"
echo "   Test now:  bash ~/.copilot/skills/take-breaks/scripts/cat-gate.sh"
echo "   Disable:   bash ~/.copilot/skills/take-breaks/scripts/uninstall.sh"
