# Changelog

One entry per `version` in `plugin.json`. A release is a version bump merged to `main` and a `v<version>` tag by hand.

## 0.4.1

- Claude Code mod: when it draws Asoka's messages, its `get_request` calls pass `wait_until: "next_message"`, so each message still shows as Asoka posts it. Every other client, and Claude Code without a screen, gets the server's default `turn_end`, which returns Asoka's messages together once its turn ends. Needs asokahq/asoka#5530; an older server ignores the argument.

## 0.4.0

- The `asoka` skill is gone, and so is the mod's prompt section. The server's own `instructions` now carry how to work with Asoka (send the user's words, wait while a request runs, show Asoka's messages in full, ask Asoka's questions with the client's question tool), so every client gets the same rules. Needs the server from asokahq/asoka#5411, which also returns the files Asoka produces as embedded resources on `get_request`.
- Claude Code mod: still shows Asoka's messages under the `get_request` call that brought them, now without their questions, which Claude asks with its question tool. When it shows them, it adds a reminder to that call's result saying so, and Claude ends its turn with one line pointing at the answer in place of quoting it. Without a screen (`claude -p`) there is no reminder and Claude quotes. Needs the server sentence about that reminder (asokahq/asoka#5486).
- Claude Code mod: a signed-out session puts `/mcp` in the prompt box, at most once every 7 days, and a `-p` or SDK session skips the greeting.
- `setup` skill: a signed-out user is sent to `/mcp`; Claude doesn't call Claude Code's `authenticate` tool.

## 0.3.0

- Claude Code mod: no polling and no wake-ups. Claude waits on Asoka itself with `get_request`'s `after` and `wait_seconds`, in every client.
- Claude Code mod: under each `get_request` call that brought new messages, the transcript shows Asoka's messages in full, so the user reads Asoka's own words. A prompt section, only in sessions with a screen, tells Claude the user sees them.
- Claude Code mod: Asoka's questions show with every option, the recommended one, and "Pick one." or "Pick any.".
- `asoka` skill: where the plugin shows Asoka's messages, Claude writes nothing about them and ends the turn; it sends the user's answer to a question on the same request.
- Keywords and marketplace tags are `asoka` only. Kiro switches a power on by its keywords, and `agent` matched almost any conversation.

## 0.2.0

- Needs the server's `get_request` with `after` and `wait_seconds` (asokahq/asoka#5227).
- Claude Code mod: watches the requests a session sends to with a short `get_request` every 5 seconds per request, so no call waits on the server. The status line shows `Asoka · running · <time> · <Asoka's latest line>` from the moment the ask is sent. One turn starts when Asoka asks a question, stops, waits for an approver, finishes or fails, and the transcript shows that wake-up as one line ("Asoka finished \"…\""). A refused call shows how to sign in; a rate-limited one pauses for 30 seconds.
- Prompt section, only in sessions the mod can wake: after `send_message`, Claude says one line and ends the turn.
- `asoka` skill: polls with `after` and `wait_seconds` (no sleeps, nothing said per poll) where the mod is not watching, such as Codex or `claude -p`.
- `setup` skill: the welcome and the capabilities are shown as text before "Try one now?". With the organization not switched on, one line says so and whom to ask, nothing more.
- After sending, Claude says in one line that Asoka has the ask, without guessing what Asoka might ask back.

## 0.1.0

- `asoka` MCP server (`send_message`, `get_request`, `setup`) for Claude Code and Codex.
- `asoka` skill: how to work with Asoka and hand work to it.
- `setup` skill (`/asoka:setup`, Codex's onboarding skill): one short welcome from the `setup` tool (who is signed in, what Asoka can do here, three asks to try, any open request to continue).
- Claude Code mod: at session start, says once who is signed in and points at `/asoka:setup`, or says how to sign in.
