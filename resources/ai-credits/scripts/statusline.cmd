@echo off
REM Windows wrapper for the Copilot CLI statusline (AI-credits flavor).
REM Point ~/.copilot/settings.json -> statusLine.command at this file, e.g.:
REM   "command": "%USERPROFILE%\\.copilot\\skills\\copilot-business-or-enterprise-plan\\scripts\\statusline.cmd"
node "%~dp0statusline.mjs"
