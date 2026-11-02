# Changelog

One entry per `version` in `plugin.json`. Publishing is manual: after the version bump
merges to `main`, a person runs `scripts/mirror-plugin.sh`, which pushes the plugin to
`asokahq/plugins` and tags `v<version>` there.

## 0.1.0

- `asoka` MCP server (`send_message`, `get_request`, `setup`) for Claude Code and Codex.
- `asoka` skill: how to work with Asoka and hand work to it.
- `setup` skill (`/asoka:setup`, Codex's onboarding skill): one short welcome from the `setup` tool (who is signed in, what Asoka can do here, three asks to try, any open request to continue).
- Claude Code mod: at session start, says once who is signed in and points at `/asoka:setup`, or says how to sign in.
