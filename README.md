# Asoka for Claude Code and Codex

Talk to Asoka, the agent that administers your organization's business systems,
from your coding agent. Which systems those are differs per organization and
grows over time, so the server says it: its `instructions` and the
`send_message` description name them ("Asoka administers Salesforce and HubSpot
for this organization"). Your agent sends Asoka work or a question, gets a
request id back at once, and polls for the result. Asoka runs it with your
organization's context, its access to those systems and its approval gates, the
same as a request from Slack.

Sign-in is through your organization's WorkOS AuthKit: the first call opens a
browser window to sign in, and the token stays with your agent. You need an
active membership in your organization's WorkOS org, and your Asoka admin has to
have the MCP server switched on for the org.

## Claude Code

Install the plugin from its marketplace:

```text
/plugin install asoka --marketplace asokahq/plugins
```

Then, in a new session, run `/mcp`, pick `asoka` and sign in in the browser.
The plugin adds the `asoka` MCP server with `send_message`, `get_request` and
`setup`, and two skills. `asoka` is how to work with Asoka and hand work to
it. `setup`, run as `/asoka:setup`, is a short welcome: who you are signed in
as, what Asoka can do for your organization, three asks to try, and any
request of yours Asoka is still waiting on. Which systems Asoka administers
for your organization, and what it does in each, come from the server itself
in every session, so nothing is written to your machine. A small mod says once
at session start who you are signed in as, or how to sign in.

Update from the **Installed** tab in `/plugin`, or with
`claude plugin update asoka@asoka-plugins`.

Publishing a new version is manual: after the `plugin.json` version bump merges to
`main`, someone with push access to `asokahq/plugins` runs `scripts/mirror-plugin.sh`
from a clean checkout of `main`; it shows what it is about to push, then pushes the
plugin and the `v<version>` tag.

### Pointing the plugin at a dev planet

The server URL is the plugin's `server_url` option, default
`https://app.asoka.com/mcp/asoka/v1`. To run against your own planet from a
checkout, start Claude Code with the plugin folder:

```bash
claude --plugin-dir asoka-claude-plugin
```

and set the option in `~/.claude/settings.json`; setting it from `/config`
inside a `--plugin-dir` session does not save it:

```json
{
  "pluginConfigs": {
    "asoka": {
      "options": { "server_url": "http://localhost:8012/mcp/asoka/v1" }
    }
  }
}
```

Behind the planet's Caddy proxy, Django's sign-in metadata names the server
as `http://localhost:8012/...`, so point `server_url` at that URL rather than
the `https://<planet>.localtest.me` one.

## Codex

The plugin follows the agent-plugins.org layout (`plugin.json`, `mcp.json`,
`skills/`), with `setup` declared as its onboarding skill and the server
declared as OAuth. Install it from the marketplace:

```bash
codex plugin marketplace add asokahq/plugins
```

then install `asoka` and run its setup; Codex signs you in and the setup skill
shows the same welcome. Two notes for Codex: sign-in with ChatGPT is in beta, and API-key
users cannot use OAuth plugins such as this one.

## What the tools do

- `send_message(message, request_id?, idempotency_key?, attachments?)`: opens a request, or
  continues one you own when `request_id` is given. Returns `{ request_id,
  action }` within a second; Asoka works in the background.
- `get_request(request_id)`: the request's `status` (`running`,
  `waiting_for_approval`, `idle`, `done`, `failed`) and the conversation so far.
  A message from Asoka that asks for details carries `questions`; answer them
  with `send_message` on the same `request_id`.

Writes run against your org's sandbox only. A change that needs sign-off waits
for an approver in your Slack, and `get_request` reports `waiting_for_approval`
while it does. The approver needs a Slack account linked in your organization; without one the write stops, so check that before the first change request.

## Limits

Per user: 60 calls a minute, 3 requests running at once, 50 new requests a day.
Your organization can also set a spend limit over a trailing seven days. A call
over a limit returns an error naming it.
