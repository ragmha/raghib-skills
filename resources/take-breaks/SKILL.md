---
name: take-breaks
description: Cat Gatekeeper — a macOS launchd agent that opens a new Terminal window with an animated ASCII cat and a 5-minute countdown every 30 minutes, forcing the user to take a break. Inspired by the Cat Gatekeeper Chrome extension and the GitHub Copilot CLI animated banner approach (frame-based ASCII, low-flicker repaint, no external deps). Use when the user asks to install, enable, disable, configure, test, or troubleshoot the cat break reminder, or mentions "the cat", "cat gatekeeper", "break reminder", "force me to take breaks", or wants to change cadence/break length/frames.
---

# Take Breaks (Cat Gatekeeper, system-level + animated)

A **launchd agent** opens a new Terminal window every 30 min and runs a frame-based ASCII cat animation with a live countdown. Window self-closes when the break ends.

Pure bash + osascript. **No external dependencies**, no `chafa`, no node — works in Apple Terminal, iTerm2, Ghostty, WezTerm, Kitty, VS Code Terminal.

## Architecture (inspired by GitHub Copilot CLI's banner)

- **Frames are plain `.txt` files** in `frames/`, loaded into an array on startup
- **Render loop:** cursor home (`\e[H`) + write whole stage + clear-below (`\e[J`) — no `clear` per tick → minimal flicker
- **Slow tick (~6 fps).** Cats shouldn't twitch. `CAT_TICK=0.18` by default
- **Color as semantic roles**, not literal RGB. `C_CAT` (cyan), `C_ACCENT` (magenta for meow/purr), `C_TIME` (yellow). Honors `NO_COLOR`
- **Accessibility opt-out:** `CAT_STATIC=1` paints once and sleeps — no animation

## Files

```
~/.copilot/skills/take-breaks/
├── SKILL.md
├── frames/
│   ├── 01-sit.txt … 08-doze.txt   # animation frames (loop in order)
│   └── end.txt                    # shown when break ends
└── scripts/
    ├── cat-gate.sh                     # opens a new Terminal window (called by launchd)
    ├── cat-screen.sh                   # the frame loop + countdown
    ├── com.raghib.cat-gatekeeper.plist # launchd template (StartInterval = 1800s)
    ├── install.sh                      # copy plist → ~/Library/LaunchAgents, load it
    └── uninstall.sh                    # unload + remove
```

## User commands → what to do

| User says | Action |
|---|---|
| "install the cat" / "enable cat gatekeeper" | `bash ~/.copilot/skills/take-breaks/scripts/install.sh` |
| "test the cat" / "fire it now" | `bash ~/.copilot/skills/take-breaks/scripts/cat-gate.sh` |
| "stop the cat" / "uninstall" / "disable" | `bash ~/.copilot/skills/take-breaks/scripts/uninstall.sh` |
| "is the cat running?" | `launchctl list \| grep cat-gatekeeper` |
| "show the cat logs" | `tail /tmp/cat-gatekeeper.log /tmp/cat-gatekeeper.err` |
| "change cadence to 45 min" | edit `StartInterval` in plist (seconds), then re-run `install.sh` |
| "change break to 10 min" | edit `BREAK_MIN` env var in plist, then re-run `install.sh` |
| "make it less twitchy / more twitchy" | add `CAT_TICK` env var to plist (seconds per frame, default 0.18) |
| "no animation, accessibility" | add `CAT_STATIC=1` env var to plist |
| "add a new cat frame" | drop a `.txt` file in `frames/` (sorted alphabetically; exclude `end.txt` which is reserved) |

## Defaults

- **Work stretch:** 30 min (`StartInterval: 1800`)
- **Break length:** 5 min (`BREAK_MIN=5`)
- **Frame rate:** ~6 fps (`CAT_TICK=0.18`)
- **Trigger:** opens a new Terminal window titled "Cat Gatekeeper", animated cat + countdown + rotating micro-break tip, self-closes at zero.

## Editing frames

- Frames live in `frames/*.txt`. Sorted alphabetically — prefix with `01-`, `02-`, … to control order.
- `end.txt` is reserved (shown once when the break ends).
- Lines containing `meow`, `purr`, or `zzz` get the accent color automatically — useful for speech.
- Keep frames the same height; otherwise the layout below them will jump.

## Editing cadence / break length

Both live in the plist:

```xml
<key>StartInterval</key><integer>1800</integer>   <!-- 30 min in seconds -->
<key>EnvironmentVariables</key>
<dict>
  <key>BREAK_MIN</key><string>5</string>
</dict>
```

After edits, re-run `install.sh` (it unloads + reloads).

## Troubleshooting

- **No Terminal window appears** → check `/tmp/cat-gatekeeper.err`. Likely needs Automation permission: System Settings → Privacy & Security → Automation → allow `bash`/`launchd` to control Terminal.
- **Window appears but no animation, just text** → either `NO_COLOR` is set (intentional) or `CAT_STATIC=1` is set in the plist.
- **Fires only once after install** → `RunAtLoad` is `false` by design; first fire is after one full `StartInterval`. To verify it's armed: `launchctl list | grep cat-gatekeeper`.
- **Want a different terminal app (iTerm2, Ghostty, etc.)** → modify the AppleScript in `cat-gate.sh` to use that app's dictionary.

## Tone (for the agent, when discussing the cat)

- The cat is cute, immovable, non-judgmental.
- Don't lecture about screen time. The cat just *is there*.
- One short sentence per status update. The Terminal window does the heavy lifting.
