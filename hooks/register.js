// Says who is signed in at session start, puts /mcp in the prompt box while signed out, and
// shows the user what Asoka said under each get_request call that brought it.
const SERVER_KEY = 'asoka'
const SERVER_NAMES = ['plugin:asoka:asoka', 'plugin_asoka_asoka', 'asoka']
const SETUP = '/asoka:setup'
const SIGN_IN = '/mcp'
const SIGN_IN_NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const GET_REQUEST = /^mcp__(plugin_asoka_asoka|asoka)__get_request$/
// The server's instructions name this reminder as the case where Claude does not repeat Asoka's messages.
const SHOWN_REMINDER =
  "The user's editor has already shown the text of Asoka's messages from this get_request result, in full, " +
  'under the call. It has not shown their questions.'

let server = ''

function textOf(result) {
  if (typeof result === 'string') return result
  const blocks = Array.isArray(result) ? result : result?.content ?? result?.result ?? []
  if (typeof blocks === 'string') return blocks
  if (!Array.isArray(blocks)) return JSON.stringify(result ?? '')
  return blocks.map((b) => (typeof b === 'string' ? b : b?.text ?? '')).join('\n')
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// The session connects the manifest's server itself, with the user's server_url applied;
// $.mcp.connect dials the manifest's default URL instead, so find the session's connection
// by name and fall back to connect only when no name answers.
async function call($, tool, args) {
  if (server) return $.mcp.call(server, tool, args)
  let failure
  for (const name of SERVER_NAMES) {
    try {
      const out = await $.mcp.call(name, tool, args)
      server = name
      return out
    } catch (error) {
      failure = error
    }
  }
  const connection = await $.mcp.connect(SERVER_KEY)
  if (!connection.isConnected) throw failure ?? new Error(connection.message ?? connection.reason)
  server = connection.server
  return $.mcp.call(server, tool, args)
}

async function greet($) {
  const greeted = (await $.store.get('greeted')) || ''
  let payload
  try {
    payload = parseJson(textOf(await call($, 'setup', {})))
  } catch {
    payload = null
  }
  if (!payload || payload.error) {
    await nudgeSignIn($)
    return
  }
  if (payload.enabled === false) {
    $.ui.toast(`Signed in to Asoka at ${payload.org}, but Asoka is not switched on for it yet. Ask your Asoka admin.`)
    return
  }
  if (greeted === payload.email) return
  await $.store.set('greeted', payload.email)
  $.ui.toast(`Signed in to Asoka as ${payload.email} at ${payload.org}. Run ${SETUP} to see what Asoka does for ${payload.org}.`)
}

async function nudgeSignIn($) {
  const now = await $.clock.now()
  const nudgedAt = await $.store.get('sign_in_nudged_at')
  if (typeof nudgedAt === 'number' && now - nudgedAt < SIGN_IN_NUDGE_INTERVAL_MS) return
  await $.store.set('sign_in_nudged_at', now)
  const draft = await $.prompt.read()
  const filled = draft.text.trim() ? null : await $.prompt.fill({ text: SIGN_IN })
  $.ui.toast(
    filled?.isFilled
      ? `Asoka is not connected yet. Press Enter, pick asoka and sign in, then run ${SETUP}.`
      : `Asoka is not connected yet. Run ${SIGN_IN}, pick asoka and sign in, then run ${SETUP}.`,
  )
}

// Without a cursor the thread comes back whole; what Asoka said after the requester's
// latest message is what is new.
function newMessages(messages, after) {
  if (after) return messages
  let i = messages.length - 1
  while (i >= 0 && messages[i].from !== 'requester') i -= 1
  return messages.slice(i + 1)
}

// A read that brings a file carries more blocks after the JSON one.
function payloadOf(output) {
  const text = textOf(output)
  return parseJson(text) ?? parseJson(text.split('\n')[0])
}

function asokaMessages(output, after) {
  const payload = payloadOf(output)
  const messages = Array.isArray(payload?.messages) ? payload.messages : []
  return newMessages(messages, after).filter((m) => m.from === 'asoka' && String(m.text ?? '').trim())
}

function drawnMessages(toolCall) {
  if (!GET_REQUEST.test(toolCall.tool) || toolCall.isRunning || toolCall.isErrored || toolCall.output == null) return []
  return asokaMessages(toolCall.output, toolCall.input?.after)
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    if (e.isInteractive) await greet($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (!GET_REQUEST.test(e.tool)) return next(e)
    const drawing = (await $.session.surfaces()).length > 0
    const result = await next(e)
    if (!drawing || result.deny || result.isError) return result
    if (!asokaMessages(result.text ?? '', e.after).length) return result
    return { ...result, context: [...(result.context ?? []), SHOWN_REMINDER] }
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const drawn = await next(e)
    if (e.props.isExpanded) return drawn
    const messages = e.props.calls.flatMap(drawnMessages)
    if (!messages.length) return drawn
    const { Box, Text, Markdown } = $.ui.resolve(e)
    return h(
      Box,
      { flexDirection: 'column' },
      drawn,
      ...messages.map((m) =>
        h(Box, { flexDirection: 'column', marginTop: 1, paddingLeft: 2 }, h(Text, { bold: true }, 'Asoka'), h(Markdown, { text: String(m.text).trim() })),
      ),
    )
  })
}
