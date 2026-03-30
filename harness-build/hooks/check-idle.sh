#!/bin/bash
# TeammateIdle hook — prevents teammates from stopping while work remains
# Checks task list for uncompleted tasks
# Exit 0: allow idle (all work done)
# Exit 2: block idle, stderr sent as feedback
set -e

# Check for active build state
if ! ls .claude/harness/build-*.json >/dev/null 2>&1; then
  exit 0
fi

# Read the latest build state to check progress
LATEST_STATE=$(ls -t .claude/harness/build-*.json 2>/dev/null | head -1 || echo "")

if [ -z "$LATEST_STATE" ]; then
  exit 0
fi

STATUS=$(python3 -c "
import json, sys
try:
    state = json.loads(open(sys.argv[1]).read())
    status = state.get('status', '')
    progress = state.get('progress', {})
    current = progress.get('current', 0)
    total = progress.get('total', 0)
    remaining = total - current
    if status == 'running' and remaining > 0:
        print(f'REMAINING:{remaining}')
    else:
        print('DONE')
except:
    print('DONE')
" "$LATEST_STATE" 2>/dev/null || echo "DONE")

if [[ "$STATUS" == REMAINING:* ]]; then
  COUNT="${STATUS#REMAINING:}"
  echo "There are still ${COUNT} incomplete tasks. Check the task list for unclaimed work." >&2
  exit 2
fi

exit 0
