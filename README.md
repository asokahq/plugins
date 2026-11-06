# Asoka for coding agents

Asoka is the agent that administers your organization's business systems. This
plugin adds Asoka's MCP server to your coding agent: the agent sends Asoka your
asks in your own words, waits while Asoka works, and shows you Asoka's answers
and the files it produces. How to work with Asoka, and what it can do for your
organization, come from the server itself, so nothing is written to your
machine.

## Claude Code

```text
/plugin install asoka --marketplace asokahq/plugins
```

Then start a new session: while you are signed out, it puts `/mcp` in the
prompt box. Press Enter, pick `asoka` and sign in in the browser.
`/asoka:setup` shows who you are signed in as, what Asoka can do for your
organization, three asks to try, and any request of yours Asoka is still
waiting on. After that, ask for what you need. Without the plugin, the same
server is one command away:

```text
claude mcp add --transport http asoka https://app.asoka.com/mcp/asoka/v1
```

Update from the **Installed** tab in `/plugin`, or with
`claude plugin update asoka@asoka-plugins`.

## Codex

```bash
codex plugin marketplace add asokahq/plugins
```

then install `asoka` and run its setup; Codex signs you in and shows the same
welcome. Sign-in with ChatGPT is in beta, and API-key users cannot use OAuth
plugins such as this one.

## Other MCP clients

Kiro, Cursor, VS Code and other clients that connect to remote MCP servers can
use Asoka without the plugin. Add the server URL below. The first time the
client connects, it signs you in through your browser.

```text
https://app.asoka.com/mcp/asoka/v1
```

### Kiro

Add this to `~/.kiro/settings/mcp.json` for every workspace, or to
`.kiro/settings/mcp.json` in one workspace:

```json
{
  "mcpServers": {
    "asoka": {
      "url": "https://app.asoka.com/mcp/asoka/v1"
    }
  }
}
```

### Cursor

Add the JSON from the Kiro section to `~/.cursor/mcp.json` for every project,
or to `.cursor/mcp.json` in one project.

### VS Code

Run **MCP: Add Server** from the Command Palette, choose **HTTP** and enter the
server URL. To write the file by hand, add this to `.vscode/mcp.json`. VS Code
uses `servers` in place of `mcpServers` and adds `"type": "http"`:

```json
{
  "servers": {
    "asoka": {
      "type": "http",
      "url": "https://app.asoka.com/mcp/asoka/v1"
    }
  }
}
```
