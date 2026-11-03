# Contributing

This repository holds the Asoka plugin for Claude Code and Codex. The server
it talks to lives in the private `asokahq/asoka` repository, in
`backend/apps/mcp_host/servers/asoka.py`; that file is the contract for the
`send_message`, `get_request` and `setup` tools and their error codes. A change
to a tool is a PR in each repository: the server change in `asokahq/asoka`, the
skill or hook change here.

Every pull request runs `claude plugin validate .` and `claude plugin test .`
(`.github/workflows/check.yml`). Run both before opening one:

```bash
npm install -g @anthropic-ai/claude-code
claude plugin validate .
claude plugin test .
```

A release is a version bump in `plugin.json` and `.claude-plugin/plugin.json`,
a line in `CHANGELOG.md`, and a `v<version>` tag pushed by hand after the bump
merges. There is no release automation.
