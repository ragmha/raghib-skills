#!/bin/bash
# Cat Gatekeeper — opens a NEW Terminal window with a cat and a countdown.
# Much harder to ignore than a notification.

BREAK_MIN="${BREAK_MIN:-5}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INNER="$SCRIPT_DIR/cat-screen.sh"

osascript <<EOF
tell application "Terminal"
  activate
  set newWin to do script "BREAK_MIN=$BREAK_MIN bash '$INNER'"
  set custom title of front window to "🐈 Cat Gatekeeper"
end tell
EOF
