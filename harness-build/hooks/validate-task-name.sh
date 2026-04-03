#!/bin/bash
# TaskCreated hook — validates task naming follows [XX-NNN]: format
# Only enforces when harness-build state files exist
# Exit 0: allow creation
# Exit 2: block creation, stderr sent as feedback
set -e

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty')

if [ -z "$TASK_SUBJECT" ]; then
  exit 0
fi

# Only enforce naming when harness-build is active
if [ ! -d ".harness" ]; then
  exit 0
fi

# Check for active build state
if ! ls .harness/build-*.json >/dev/null 2>&1; then
  exit 0
fi

# Validate [XX-NNN]: format (e.g., [US-001]:, [BUG-042]:, [TASK-003]:)
if [[ ! "$TASK_SUBJECT" =~ ^\[[A-Z]+-[0-9]+\]:\ .+ ]]; then
  echo "Task subject must follow format: [XX-NNN]: Title (e.g., '[US-001]: Add status field')" >&2
  exit 2
fi

exit 0
