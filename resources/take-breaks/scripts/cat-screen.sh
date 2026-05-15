#!/bin/bash
# Cat Gatekeeper screen — animated walking + jumping cat with countdown.
# Inspired by GitHub Copilot CLI's animated banner approach:
#   - frames are plain .txt sprites (position-agnostic)
#   - render loop: cursor home + write whole stage + clear-below
#   - the SCRIPT, not the frame, controls position (x slide, y jump)
# Pure bash 3.2 + osascript. No external deps.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRAMES_DIR="$SCRIPT_DIR/../frames"
BREAK_MIN="${BREAK_MIN:-5}"
TICK="${CAT_TICK:-0.12}"        # seconds per frame (~8 fps — good for walking)
STAGE_WIDTH="${CAT_STAGE_W:-50}" # cols inside the stage
STAGE_HEIGHT=6                   # lines reserved for the cat stage (incl. jump headroom)
SPRITE_HEIGHT=4                  # all sprites are 4 lines tall
SPRITE_WIDTH=8                   # rough cat width for bounce math

# ── Colors (semantic roles, NO_COLOR honored) ──────────────────────
if [ -z "${NO_COLOR:-}" ] && [ -t 1 ]; then
  C_DIM=$'\e[2m'; C_BOLD=$'\e[1m'
  C_CAT=$'\e[36m'; C_ACCENT=$'\e[35m'; C_TIME=$'\e[33m'
  C_RESET=$'\e[0m'
else
  C_DIM=''; C_BOLD=''; C_CAT=''; C_ACCENT=''; C_TIME=''; C_RESET=''
fi

# ── Tips ───────────────────────────────────────────────────────────
TIPS=(
  "look 20ft away for 20 seconds (20-20-20)"
  "stand up. roll your shoulders. neck circles."
  "drink water — not coffee."
  "4 slow breaths: in 4, hold 4, out 6."
  "stare out a window. no phone."
  "feet flat. shoulders down. screen at eye level."
  "walk to another room and back."
  "blink slowly 10 times."
  "unclench your jaw. drop your shoulders."
)
TIP="${TIPS[$RANDOM % ${#TIPS[@]}]}"

END_TS=$(( $(date +%s) + BREAK_MIN * 60 ))
RESUME=$(date -v+${BREAK_MIN}M "+%H:%M" 2>/dev/null || date -d "+${BREAK_MIN} minutes" "+%H:%M")

# ── Cursor handling ────────────────────────────────────────────────
tput civis 2>/dev/null || true
cleanup() { tput cnorm 2>/dev/null || true; printf '%s' "$C_RESET"; }
trap cleanup EXIT INT TERM
clear

# ── Load sprite as a 4-line array ──────────────────────────────────
# Usage: load_sprite <file>  -> populates SPRITE[0..3]
SPRITE=("" "" "" "")
load_sprite() {
  local f="$1" i=0
  SPRITE=("" "" "" "")
  while IFS= read -r line || [ -n "$line" ]; do
    SPRITE[$i]="$line"
    i=$((i + 1))
    [ $i -ge $SPRITE_HEIGHT ] && break
  done < "$f"
}

# ── Repeat a char N times (bash 3.2 friendly) ──────────────────────
spaces() {
  local n="$1" out=""
  while [ "$n" -gt 0 ]; do out="$out "; n=$((n - 1)); done
  printf '%s' "$out"
}

# ── State ──────────────────────────────────────────────────────────
x=0
dir=1                 # +1 right, -1 left
walk_toggle=0         # 0=walk-a, 1=walk-b
jump_phase=0          # 0=not jumping, 1..5=jump frames
pause_phase=0         # 0=walking, >0=meow countdown
tick_count=0
MAX_X=$(( STAGE_WIDTH - SPRITE_WIDTH ))
[ "$MAX_X" -lt 0 ] && MAX_X=0

# Jump trajectory (y_offset per phase). Higher = higher off ground.
JUMP_Y=(0 1 2 2 1 0)

# ── Render one frame of the stage ──────────────────────────────────
render_stage() {
  local y_off="$1"
  # blank lines above the cat = (STAGE_HEIGHT - SPRITE_HEIGHT - y_off)
  local top_blanks=$(( STAGE_HEIGHT - SPRITE_HEIGHT - y_off ))
  [ "$top_blanks" -lt 0 ] && top_blanks=0
  local bot_blanks=$(( STAGE_HEIGHT - SPRITE_HEIGHT - top_blanks ))
  [ "$bot_blanks" -lt 0 ] && bot_blanks=0

  local pad
  pad=$(spaces "$x")

  local i
  for ((i = 0; i < top_blanks; i++)); do printf '\n'; done
  for ((i = 0; i < SPRITE_HEIGHT; i++)); do
    local line="${SPRITE[i]}"
    if [[ "$line" == *"meow"* || "$line" == *"purr"* ]]; then
      printf '%s%s%s%s\n' "$pad" "$C_ACCENT" "$line" "$C_RESET"
    else
      printf '%s%s%s%s\n' "$pad" "$C_CAT" "$line" "$C_RESET"
    fi
  done
  for ((i = 0; i < bot_blanks; i++)); do printf '\n'; done
}

# ── Render the whole UI (called every tick) ────────────────────────
render() {
  local remain="$1" min sec
  min=$((remain / 60)); sec=$((remain % 60))

  printf '\e[H'  # cursor home — don't `clear` (avoids flicker)

  printf '\n'
  printf '  %s╔══════════════════════════════════════════════════════════╗%s\n' "$C_DIM" "$C_RESET"
  printf '  %s║%s              %s🐈  CAT  GATEKEEPER  🐈%s                      %s║%s\n' "$C_DIM" "$C_RESET" "$C_BOLD" "$C_RESET" "$C_DIM" "$C_RESET"
  printf '  %s╚══════════════════════════════════════════════════════════╝%s\n' "$C_DIM" "$C_RESET"
  printf '\n'

  # The stage (fixed height — cat moves within it)
  printf '  '
  render_stage "${JUMP_Y[$jump_phase]:-0}"

  # Ground line
  printf '  %s%s%s\n' "$C_DIM" "──────────────────────────────────────────────────" "$C_RESET"
  printf '\n'
  printf '      the cat has arrived. you have been gated.\n\n'
  printf '      %s⏱  %02d:%02d%s remaining   %s🔓 resume at %s%s\n' "$C_TIME" "$min" "$sec" "$C_RESET" "$C_DIM" "$RESUME" "$C_RESET"
  printf '      %s→ %s%s\n\n' "$C_BOLD" "$TIP" "$C_RESET"
  printf '      %s(window self-closes. Ctrl+C escapes — but the cat is judging.)%s\n' "$C_DIM" "$C_RESET"

  printf '\e[J'  # clear anything below from previous frame
}

# ── Main loop ──────────────────────────────────────────────────────
while :; do
  now=$(date +%s)
  remain=$(( END_TS - now ))
  [ "$remain" -le 0 ] && break

  # Decide which sprite + position update for THIS tick
  if [ "$jump_phase" -gt 0 ]; then
    # Mid-jump: hold jump sprite, advance phase, keep moving horizontally
    load_sprite "$FRAMES_DIR/jump.txt"
    jump_phase=$((jump_phase + 1))
    [ "$jump_phase" -gt 5 ] && jump_phase=0
    x=$((x + dir))
  elif [ "$pause_phase" -gt 0 ]; then
    # Mid-meow pause: hold meow sprite, no movement
    load_sprite "$FRAMES_DIR/meow.txt"
    pause_phase=$((pause_phase - 1))
  else
    # Normal walking
    if [ "$walk_toggle" -eq 0 ]; then
      load_sprite "$FRAMES_DIR/walk-a.txt"
    else
      load_sprite "$FRAMES_DIR/walk-b.txt"
    fi
    walk_toggle=$((1 - walk_toggle))
    x=$((x + dir))

    # Random events — start a jump (~1/15) or a meow pause (~1/40)
    r=$((RANDOM % 60))
    if [ "$r" -lt 4 ]; then
      jump_phase=1
    elif [ "$r" -lt 6 ]; then
      pause_phase=8   # ~1 sec at 8fps
    fi
  fi

  # Bounce off edges
  if [ "$x" -ge "$MAX_X" ]; then x=$MAX_X; dir=-1; fi
  if [ "$x" -le 0 ]; then x=0; dir=1; fi

  render "$remain"
  tick_count=$((tick_count + 1))
  sleep "$TICK"
done

# ── End screen ─────────────────────────────────────────────────────
clear
printf '%s' "$C_CAT"
cat "$FRAMES_DIR/end.txt"
printf '%s\n' "$C_RESET"
sleep 2

osascript -e 'tell application "Terminal" to close (every window whose name contains "Cat Gatekeeper")' 2>/dev/null &
exit 0
