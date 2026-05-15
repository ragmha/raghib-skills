# ai-credits — Copilot CLI statusline

A cross-platform statusline for [GitHub Copilot CLI](https://github.com/github/copilot-cli). Renders up to three lines under the prompt: model + context gauge, current path + git branch + line changes, and credits burn vs plan.

```
🧠 gpt-5.4 · ████▍░░░░░ 44% 87.9k/200.0k · last ↓2.1k ↑412 · ⏱ 12m04s
📁 ~/code/agentic-ai-days · ● ⎇ main · +42 -8
💳 Business: $0.96 / $19.00 (5.1%) · session $0.06 · $18.04 left · 📈 ▂▃▂▄▅▄▅▆▅▇ · 📅 █████▌░░░░░░░░░░░░░░░░░░░░░░░░ d6/30
```

## Requirements

- GitHub Copilot CLI with experimental features enabled (this whole feature is experimental).
- Node.js 18+ on `PATH` (already required by Copilot CLI).
- Optional: a Nerd Font (e.g. `FiraCode Nerd Font`, `JetBrainsMono Nerd Font`) for `COPILOT_AI_CREDITS_NERD=1`. Default uses universal emoji.

## 1. Enable the statusline feature flag

In `~/.copilot/settings.json`, enable **either** path:

```json
{
  "experimental": true
}
```

…**or** opt in just to this feature:

```json
{
  "feature_flags": { "enabled": ["STATUS_LINE"] }
}
```

If `feature_flags.enabled` already exists, *append* `"STATUS_LINE"` — don't replace the array.

## 2. Wire up the script

### macOS / Linux / WSL

```jsonc
{
  "statusLine": {
    "type":    "command",
    "command": "/Users/YOU/.copilot/skills/ai-credits/scripts/statusline.mjs",
    "padding": 1
  }
}
```

Use the absolute path to the script itself — the Copilot CLI checks `existsSync(command)`
and won't run anything if the value isn't a real file. Don't prefix with `node`; the script
has a `#!/usr/bin/env node` shebang and is executable, so the CLI's `spawn(cmd, [], { shell: false })`
will run it directly. `~` is not always expanded in this setting.

### Windows (cmd / PowerShell)

Use the `.cmd` wrapper. Putting `node "..."` directly in `command` is unreliable on Windows.

```jsonc
{
  "statusLine": {
    "type":    "command",
    "command": "C:\\Users\\YOU\\.copilot\\skills\\ai-credits\\scripts\\statusline.cmd",
    "padding": 1
  }
}
```

## 3. Restart Copilot CLI

Settings are read at launch, so restart the host process or run `/restart` inside Copilot CLI.

## Smoke test

```bash
node ~/.copilot/skills/ai-credits/scripts/test.mjs
```

## 4. Pick a plan

The credits/calendar lines stay hidden until a plan is set. Two options:

```bash
# Option A — interactive picker (zero-cost shell command, no agent)
node ~/.copilot/skills/ai-credits/scripts/cost.mjs set-plan

# Option B — set-and-forget via env var (statusline seeds it on next render)
echo 'export COPILOT_AI_CREDITS_PLAN=unlimited' >> ~/.zshrc   # business | enterprise | unlimited
```

## Smoke test (no Copilot needed)

```bash
cat ~/.copilot/skills/ai-credits/scripts/sample-payload.json \
  | node ~/.copilot/skills/ai-credits/scripts/statusline.mjs
echo
```

If that renders, Copilot CLI will too. Empty stdin works as well — emits one quiet line or nothing.

## Customization

Set any of these env vars (e.g. in your shell rc) to tune the statusline:

| Env var | Default | Effect |
|---|---|---|
| `COPILOT_AI_CREDITS_PLAN` | (unset) | Auto-seed plan on first render. `business` / `enterprise` / `unlimited`. |
| `COPILOT_AI_CREDITS_LAYOUT_LINE1` | `rgb_bar,spend,tokens_bar` | Comma-separated segment list for line 1. The default shows context pressure, spend, and input/cached/output token counts. |
| `COPILOT_AI_CREDITS_LAYOUT_LINE2` | (empty) | …line 2. Empty value hides the line. Set e.g. `git,lines` to add it back. |
| `COPILOT_AI_CREDITS_LAYOUT_LINE3` | (empty) | …line 3. Set e.g. `sparkline,calendar` to add the burn-rate row. |
| `COPILOT_AI_CREDITS_GAUGE_CELLS` | `10` | Width of the context-window gauge. |
| `COPILOT_AI_CREDITS_SPARK_LEN` | `12` | Number of recent context-% samples in the sparkline. |
| `COPILOT_AI_CREDITS_PATH_MODE` | `abbrev` | `abbrev` (`~/.../foo/bar`), `leaf` (`bar`), or `full`. |
| `COPILOT_AI_CREDITS_NERD` | unset | Set to `1` to swap emoji icons for Nerd Font glyphs. |
| `COPILOT_AI_CREDITS_OSC8` | `1` | Set to `0` to disable OSC 8 clickable-link wrapping on git/repo segments. |
| `COPILOT_AI_CREDITS_COLS` | auto | Override max line width. Defaults to terminal columns. |
| `NO_COLOR` | unset | Set to anything to disable ANSI colors entirely. |

Available segment names: `model`, `context_bar`, `last_call`, `session_tokens`, `duration`, `path`, `git`, `lines`, `session_name`, `credits`, `sparkline`, `calendar`, `tokens_bar`.

### Example: live token breakdown next to spend

```bash
export COPILOT_AI_CREDITS_LAYOUT_LINE1="spend,tokens_bar"
```

Renders `🔷 in 12k ♻️ cache 8k 🔶 out 3k`. For the full annotated view with descriptions, run:

```bash
node ~/.copilot/skills/ai-credits/scripts/cost.mjs breakdown \
  --model claude-opus-4.7 --in 2150 --out 412 --cache 1200
```

### Example: minimalist single line

```bash
export COPILOT_AI_CREDITS_LAYOUT_LINE1="model,context_bar,credits"
export COPILOT_AI_CREDITS_LAYOUT_LINE2=""
export COPILOT_AI_CREDITS_LAYOUT_LINE3=""
```

### Example: maxed out, Nerd Font, leaf path

```bash
export COPILOT_AI_CREDITS_NERD=1
export COPILOT_AI_CREDITS_PATH_MODE=leaf
export COPILOT_AI_CREDITS_GAUGE_CELLS=16
```

## Reading the credits line

```
💳 Business: $0.96 / $19.00 (5.1%) · session $0.06 · $18.04 left
```

- **Plan label** (`Business` / `Enterprise` / `Unlimited`).
- **Burned $ / Allowance $ (% burned)**. Color tracks the burn percent (green → yellow → red).
- **session $X** — live cost of the current Copilot session (computed from the JSON payload, not yet recorded). Shown only if the current model id is in our price table.
- **$X left** — remaining headroom in the current month.

For `unlimited`, the line collapses to: `♾ Unlimited · session $X (Y cr) · month $Z` and the calendar is hidden.

## Reading the burn calendar

```
📅 █████▌░░░░░░░░░░░░░░░░░░░░░░░░ d6/30
```

- One cell per day of the current month (UTC).
- `█` = day completed; `▌` = today; `░` = future.
- Color of completed days reflects pace: **green** when burn% is well below elapsed%, **yellow** on pace, **red** when outpacing the month (you'll exceed your allowance at this rate).

## Performance & privacy

- The statusline runs on every render. Keep it fast — anything > ~500 ms can be killed by Copilot CLI.
- This script's only subprocess calls are `git -C <cwd> branch --show-current` / `status --porcelain` / `remote get-url origin`, all with 200 ms timeouts and silent failure. No network calls.
- Treat the statusline like a screenshot: it can appear in recordings, livestreams, and bug reports. Don't add segments that render secrets, tokens, customer names, or private URLs.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Nothing shows under the prompt | Confirm `experimental: true` *or* `feature_flags.enabled` includes `STATUS_LINE`. Run `/restart`. |
| `ai-credits unavailable` | Statusline crashed. Run the smoke test above to see the real error from `node`. |
| Credits line missing | No plan set yet. Run `set-plan` or set `COPILOT_AI_CREDITS_PLAN`. |
| Calendar missing | Either no plan, plan is `unlimited`, or it's day 1 of the month (intentional — no signal). |
| Boxes / `?` instead of icons | Either install a Nerd Font and set `COPILOT_AI_CREDITS_NERD=1`, or stay on emoji default and check your terminal supports them. |
| Garbled colors | Set `NO_COLOR=1` to confirm; if that works your terminal lacks ANSI support. |
| OSC 8 hyperlinks not clickable | Older terminals ignore OSC 8 (the link text still renders fine). VS Code 1.72+, iTerm2, WezTerm, Ghostty, Windows Terminal all support it. Disable with `COPILOT_AI_CREDITS_OSC8=0` if your terminal renders the escape codes literally. |
