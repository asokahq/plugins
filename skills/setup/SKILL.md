---
name: setup
description: Show what Asoka does for the user's organization and offer an ask to try. Run after installing the asoka plugin, or when the user asks what Asoka can do for them.
---

# Set up Asoka

The user has just installed the Asoka plugin. Asoka is the agent that
administers their organization's business systems and does work in them on
request, and this plugin lets the user hand it that work from here. Setup is one
short conversation. By the end the user knows which organization they are signed
in to and what Asoka can do for it, and has seen the asks they could type right
now. You are done when that is true, or when the user knows how to sign in.
Nothing is installed: the `asoka` skill and the server's own
instructions carry everything later sessions need.

## One call carries all of it

The `setup` tool on the `asoka` server returns `org`, `email`, `enabled`,
and, when `enabled` is true, `systems`, `capabilities`, `writes`, `examples`
and `open_requests` (each with `request_id`, `title`, `status`, `opened_at`). Call it first, and only once,
since nothing in setup needs a second call.

A failed call, or a result with `error`, means the user is not signed in, or is
signed in with an account that is not a member of an Asoka organization. Say
that in a line, say how to sign in, and stop, because you cannot sign the user
in from here and nothing below is true until they have. In Claude Code: run
`/mcp`, pick `asoka` and sign in in the browser, then run `/asoka:setup` again.
In Codex: sign in to the `asoka` server when Codex asks, or from its list of the
plugin's servers, then run the plugin's setup again.

## The welcome

One sentence that says Asoka is ready and who is signed in where, then the list
of what the user can do, then the offer to try an ask. The facts and the asks
come from the server word for word, because they describe this organization
and yours would describe a typical one:

1. "Asoka is ready. You're signed in as `email` at `org`, connected to
   `systems`."
2. "What you can do with Asoka:" and `capabilities`, one bullet each.
3. The offer, after lines 1 and 2 are in your reply as text the user can read,
   because a question tool takes the screen while it is open and an ask picked
   before the user has seen what Asoka can do is picked blind. Where you have a
   tool that asks the user a question with options (Claude Code's
   `AskUserQuestion`), ask "Try one now?" with each of the
   `examples` as an option, verbatim, and "Skip" last, since picking beats
   retyping. When `open_requests` is not empty, its first entry goes before
   the examples as "Continue: `title`", because work the user already started
   beats a sample. Without such a tool, list the same options and ask in one
   line. A picked example goes to Asoka through the `asoka` skill as a new
   request; a picked open request continues through `get_request` on its
   `request_id`, as the `asoka` skill describes.

Nothing else: not the tools, the limits, the request loop or `writes` on its
own, because the `asoka` skill carries those and the user meets them when they
first send work. A welcome longer than a screen is a document, and nobody reads
it.

When `enabled` is false, the result carries only `org`, `email` and
`enabled`, since the server shares nothing more about an organization that has
not switched it on. Say in one line that the user is signed in at `org` but
Asoka is not switched on for this plugin yet, and that the person who
administers Asoka for the organization (usually whoever set it up in Slack)
can switch it on. Nothing else follows.

## Where the line is

Passes, signed in and enabled at an organization with Salesforce:

> Asoka is ready. You're signed in as alice@acme.com at Acme Robotics,
> connected to Salesforce.
>
> What you can do with Asoka:
> - Explain your org: why a Flow fires, why a stage resets, who can see a
>   field.
> - Look things up: what changed and when, which records match a question, who
>   has which access.
> - Make changes: fields, layouts, automations, record updates. Built in the
>   sandbox, approved in Slack.
>
> Try one now? (a question with the three asks as options, and Skip)

Fails: the same, preceded by who you are signed in as on its own line, the
sandbox sentence again on its own line, a line that the skill file was already
current, and a paragraph on `send_message` and polling. Every sentence of it is
true, each was said once already or was not asked for, and the one line the
user wanted, that Asoka is ready, is now the fifth thing on the screen.
