#!/bin/bash
# Uninstall Cat Gatekeeper launchd agent.
PLIST_DST="$HOME/Library/LaunchAgents/com.raghib.cat-gatekeeper.plist"
launchctl unload "$PLIST_DST" 2>/dev/null || true
rm -f "$PLIST_DST"
echo "🐈 Cat Gatekeeper uninstalled. The cat sleeps."
