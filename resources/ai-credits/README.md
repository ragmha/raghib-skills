# ai-credits

Track Copilot model spend in USD / AI credits and optionally render a live Copilot CLI statusline.

## Setup

1. Copy or clone this folder to your Copilot skills directory:

   ```bash
   mkdir -p ~/.copilot/skills
   cp -R ai-credits ~/.copilot/skills/ai-credits
   chmod +x ~/.copilot/skills/ai-credits/scripts/*.mjs
   ```

2. Pick your plan:

   ```bash
   node ~/.copilot/skills/ai-credits/scripts/cost.mjs set-plan business
   ```

   Supported plans are `business`, `enterprise`, and `unlimited`.

3. Test the CLI:

   ```bash
   node ~/.copilot/skills/ai-credits/scripts/test.mjs
   node ~/.copilot/skills/ai-credits/scripts/cost.mjs status
   ```

## Enable the Copilot CLI statusline

1. Enable the statusline feature in `~/.copilot/settings.json`:

   ```json
   {
     "experimental": true
   }
   ```

2. Add the statusline command. Use an absolute path, not `~`, and do not prefix it with `node`.

   macOS / Linux / WSL:

   ```jsonc
   {
     "statusLine": {
       "type": "command",
       "command": "/Users/YOU/.copilot/skills/ai-credits/scripts/statusline.mjs",
       "padding": 1
     }
   }
   ```

   Windows:

   ```jsonc
   {
     "statusLine": {
       "type": "command",
       "command": "C:\\Users\\YOU\\.copilot\\skills\\ai-credits\\scripts\\statusline.cmd",
       "padding": 1
     }
   }
   ```

3. Restart Copilot CLI or run `/restart`.

The default statusline shows context pressure, spend, and token breakdown:

```text
⚡ █████████░░░░░░░░░░░ 44% │ 💳 $0.00 / $19 │ 🔷 in 184k ♻️ cache 24.6k 🔶 out 12.5k
```

## Customize

Set layout environment variables in your shell rc:

```bash
export COPILOT_AI_CREDITS_LAYOUT_LINE1="rgb_bar,spend,tokens_bar"
export COPILOT_AI_CREDITS_LAYOUT_LINE2=""
export COPILOT_AI_CREDITS_LAYOUT_LINE3=""
```

Available segments: `model`, `context_bar`, `rgb_bar`, `spend`, `credits`, `tokens_bar`, `last_call`, `session_tokens`, `duration`, `path`, `git`, `lines`, `session_name`, `sparkline`, `calendar`.

See [STATUSLINE.md](STATUSLINE.md) for full statusline configuration and [REFERENCE.md](REFERENCE.md) for pricing details.
