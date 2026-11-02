# Changelog

One entry per `version` in `plugin.json`. A release is a version bump merged to `main` and a `v<version>` tag by hand.

## 0.2.0

- Needs the server's `get_request` with `after` and `wait_seconds` (asokahq/asoka#5227).
- Claude Code mod: watches the requests a session sends to, long-polls them (`wait_seconds: 45`, one call in flight per request), shows Asoka's latest line in the status line while it runs, and starts one turn when Asoka asks a question, stops, waits for an approver, finishes or fails. A refused call shows how to sign in; a rate-limited one pauses for 30 seconds.
- Prompt section, only in sessions the mod can wake: after `send_message`, Claude says one line and ends the turn.
- `asoka` skill: polls with `after` and `wait_seconds` (no sleeps, nothing said per poll) where the mod is not watching, such as Codex or `claude -p`.
- `setup` skill: the welcome and the capabilities are shown as text before "Try one now?".

## 0.1.0

- `asoka` MCP server (`send_message`, `get_request`, `setup`) for Claude Code and Codex.
- `asoka` skill: how to work with Asoka and hand work to it.
- `setup` skill (`/asoka:setup`, Codex's onboarding skill): one short welcome from the `setup` tool (who is signed in, what Asoka can do here, three asks to try, any open request to continue).
- Claude Code mod: at session start, says once who is signed in and points at `/asoka:setup`, or says how to sign in.
