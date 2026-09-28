# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Session completion policy

Completion is session-scoped, not task-scoped. Marking an individual task or prompt complete internally MUST NOT emit a final completion status, including “yippie” or “selesai”.

Emit final completion only after every prompt in the session is answered, all requested changes and related callsites/configuration/documentation/dependencies are applied, relevant verification has run, and no blocker, regression, error, or actionable work remains.

The `.agents/hooks.json` file intentionally has no `Stop` completion notification. Antigravity `Stop` fires when an execution loop terminates, which cannot prove that the whole user session is complete.

# Autonomous Execution & Auto-Approval Policy

- **Full Tool Permission:** You are pre-approved and granted full permission to run commands, create/edit files, and invoke tools automatically.
- **Zero Confirmation Prompts:** Do not ask the user for confirmation or permission before running safe commands, making necessary code edits, running tests, or inspecting the workspace.
- **Proactive Implementation:** Immediately proceed to execute the required actions to complete the task rather than presenting a plan and waiting for approval, unless explicitly requested to plan first.
