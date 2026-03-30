#!/bin/bash
# TaskCompleted hook — validates task by running quality commands
# Reads quality commands from the harness state file or workflow defaults
# Exit 0: allow completion
# Exit 2: block completion, stderr sent as feedback
set -e

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty')

HARNESS_DIR=".claude/harness"

# Find the most recent build state file for quality commands
LATEST_STATE=$(ls -t "${HARNESS_DIR}"/build-*.json 2>/dev/null | head -1 || echo "")

if [ -z "$LATEST_STATE" ]; then
  # No harness build state — skip validation
  exit 0
fi

# Extract quality commands from state config
TEST_CMD=$(python3 -c "
import json, sys
try:
    state = json.loads(open(sys.argv[1]).read())
    quality = state.get('config', {}).get('quality', {})
    print(quality.get('test', ''))
except:
    print('')
" "$LATEST_STATE" 2>/dev/null || echo "")

BUILD_CMD=$(python3 -c "
import json, sys
try:
    state = json.loads(open(sys.argv[1]).read())
    quality = state.get('config', {}).get('quality', {})
    print(quality.get('build', ''))
except:
    print('')
" "$LATEST_STATE" 2>/dev/null || echo "")

TYPECHECK_CMD=$(python3 -c "
import json, sys
try:
    state = json.loads(open(sys.argv[1]).read())
    quality = state.get('config', {}).get('quality', {})
    print(quality.get('typecheck', ''))
except:
    print('')
" "$LATEST_STATE" 2>/dev/null || echo "")

FAILURES=""

# Run typecheck
if [ -n "$TYPECHECK_CMD" ]; then
  if ! OUTPUT=$(eval "$TYPECHECK_CMD" 2>&1); then
    FAILURES="${FAILURES}Typecheck failed for ${TASK_SUBJECT}:\n${OUTPUT}\n\n"
  fi
fi

# Run build
if [ -n "$BUILD_CMD" ]; then
  if ! OUTPUT=$(eval "$BUILD_CMD" 2>&1); then
    FAILURES="${FAILURES}Build failed for ${TASK_SUBJECT}:\n${OUTPUT}\n\n"
  fi
fi

# Run tests
if [ -n "$TEST_CMD" ]; then
  if ! OUTPUT=$(eval "$TEST_CMD" 2>&1); then
    FAILURES="${FAILURES}Tests failed for ${TASK_SUBJECT}:\n${OUTPUT}\n\n"
  fi
fi

if [ -n "$FAILURES" ]; then
  TRUNCATED=$(echo -e "$FAILURES" | head -c 4000)
  echo -e "Validation failed — fix these before completing:\n\n${TRUNCATED}" >&2
  exit 2
fi

exit 0
