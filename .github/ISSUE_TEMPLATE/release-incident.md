---
name: Release incident report
about: Record a failed/partial release and recovery actions
title: "[Release Incident] "
labels: ["release", "incident"]
---

## Summary

Briefly describe what failed and current status.

## Release context

- Channel: `stable` / `next`
- Workflow run URL:
- Commit SHA:
- Triggered by:
- Dry run completed before publish: `yes` / `no`

## Impact

- Affected packages:
- Published tags affected (`latest`, `next`, or both):
- User-facing impact:

## Failure details

- Failing workflow step:
- Error output (trimmed):
  ```text
  paste logs here
  ```

## Timeline (UTC)

- `HH:MM` Detection
- `HH:MM` Triage started
- `HH:MM` Mitigation applied
- `HH:MM` Recovery completed

## Recovery actions taken

- [ ] Verified npm dist-tags for all affected packages
- [ ] Verified whether partial publish occurred
- [ ] Added follow-up changeset if needed
- [ ] Re-ran release workflow
- [ ] Confirmed tags/commit state on `main`

## Root cause

Describe root cause and contributing factors.

## Preventive actions

- [ ] Add/update automated check(s)
- [ ] Update release docs/checklist
- [ ] Add tests for failure scenario
- [ ] Create RFC if process changes are required
