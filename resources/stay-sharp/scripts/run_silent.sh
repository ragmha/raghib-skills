#!/usr/bin/env bash
# run_silent: swallow stdout/stderr on success, dump full output on failure.
# Usage:  source run_silent.sh
#         run_silent "description" "command string"
# Returns the wrapped command's exit code.

run_silent() {
    local description="$1"
    local command="$2"
    local tmp_file
    tmp_file=$(mktemp)

    if eval "$command" > "$tmp_file" 2>&1; then
        # One-line summary for known frameworks (best-effort, never fatal)
        local summary=""
        if grep -qE '^=+ .* (passed|failed|error)' "$tmp_file"; then
            # pytest
            summary=$(grep -oE '[0-9]+ passed[^,]*(, [0-9]+ failed)?(, [0-9]+ skipped)?' "$tmp_file" | tail -n1)
        elif grep -qE 'Tests:\s+[0-9]+ (passed|failed)' "$tmp_file"; then
            # jest / vitest
            summary=$(grep -oE 'Tests:.*' "$tmp_file" | tail -n1)
        elif grep -qE '^ok\s+\S+\s+[0-9.]+s' "$tmp_file"; then
            # go test
            summary="$(grep -cE '^ok\s' "$tmp_file") packages ok"
        elif grep -qE '\[INFO\] BUILD SUCCESS' "$tmp_file"; then
            # maven
            summary=$(grep -oE 'Tests run: [0-9]+, Failures: [0-9]+, Errors: [0-9]+, Skipped: [0-9]+' "$tmp_file" | tail -n1)
            [ -z "$summary" ] && summary="maven build success"
        elif grep -qE '^BUILD SUCCESSFUL' "$tmp_file"; then
            # gradle
            summary=$(grep -oE '[0-9]+ tests? completed.*' "$tmp_file" | tail -n1)
            [ -z "$summary" ] && summary="gradle build successful"
        elif grep -qE '\*\* BUILD SUCCEEDED \*\*' "$tmp_file"; then
            # xcodebuild
            summary="xcodebuild succeeded"
        elif grep -qE '^\s*Finished\s+(test|dev|release)' "$tmp_file"; then
            # cargo
            summary=$(grep -oE 'test result: ok\. [0-9]+ passed[^;]*' "$tmp_file" | tail -n1)
            [ -z "$summary" ] && summary="cargo finished"
        fi
        if [ -n "$summary" ]; then
            printf "  ✓ %s — %s\n" "$description" "$summary"
        else
            printf "  ✓ %s\n" "$description"
        fi
        rm -f "$tmp_file"
        return 0
    else
        local exit_code=$?
        printf "  ✗ %s (exit %d)\n" "$description" "$exit_code"
        cat "$tmp_file"
        rm -f "$tmp_file"
        return $exit_code
    fi
}
