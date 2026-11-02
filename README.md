# Asoka for Claude Code and Codex

Talk to Asoka, the agent that administers your organization's business systems,
from your coding agent. Your agent sends Asoka work or a question, gets a
request id back at once, and polls for the result. Asoka runs it with your
organization's context, its access to those systems and its approval gates, the
same as a request from Slack. Which systems Asoka administers for your
organization comes from the server itself, so nothing is written to your machine.

## Claude Code

```text
/plugin install asoka --marketplace asokahq/plugins
```

Then, in a new session, run `/mcp`, pick `asoka` and sign in in the browser.
`/asoka:setup` shows who you are signed in as, what Asoka can do for your
organization, three asks to try, and any request of yours Asoka is still
waiting on. After that, ask for what you need; the `asoka` skill hands the work
to Asoka and brings back the answer.

Update from the **Installed** tab in `/plugin`, or with
`claude plugin update asoka@asoka-plugins`.

## Codex

```bash
codex plugin marketplace add asokahq/plugins
```

then install `asoka` and run its setup; Codex signs you in and shows the same
welcome. Sign-in with ChatGPT is in beta, and API-key users cannot use OAuth
plugins such as this one.

## Changes

A change Asoka makes lands in your organization's sandbox and waits for an
approver in your Slack before anything moves on; your agent tells you what is
waiting and on whom.
