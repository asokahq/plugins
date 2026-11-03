// Says who is signed in at session start, and shows the user what Asoka said under each
// get_request call that brought it.
const SERVER_KEY = 'asoka'
const SERVER_NAMES = ['plugin:asoka:asoka', 'plugin_asoka_asoka', 'asoka']
const SETUP = '/asoka:setup'
const GET_REQUEST = /^mcp__(plugin_asoka_asoka|asoka)__get_request$/
const SHOWN_SECTION =
  'The asoka plugin shows the user every message Asoka sends, in full, under the get_request call that returned it.'

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
    $.ui.toast(`Asoka is not connected yet. Sign in from /mcp, then run ${SETUP}.`)
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

// Without a cursor the thread comes back whole; what Asoka said after the requester's
// latest message is what is new.
function newMessages(messages, after) {
  if (after) return messages
  let i = messages.length - 1
  while (i >= 0 && messages[i].from !== 'requester') i -= 1
  return messages.slice(i + 1)
}

function asokaMessages(toolCall) {
  if (!GET_REQUEST.test(toolCall.tool) || toolCall.isRunning || toolCall.isErrored || toolCall.output == null) return []
  const payload = parseJson(textOf(toolCall.output))
  const messages = Array.isArray(payload?.messages) ? payload.messages : []
  return newMessages(messages, toolCall.input?.after).filter((m) => m.from === 'asoka' && String(m.text ?? '').trim())
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await greet($)
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!e.surfaces?.length) return composed
    const sections = [...(composed?.sections ?? []), { id: 'asoka-shown', text: SHOWN_SECTION, scope: 'session' }]
    return { ...composed, sections }
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const drawn = await next(e)
    if (e.props.isExpanded) return drawn
    const messages = e.props.calls.flatMap(asokaMessages)
    if (!messages.length) return drawn
    const { Box, Text, Markdown } = $.ui.resolve(e)
    return h(
      Box,
      { flexDirection: 'column' },
      drawn,
      ...messages.map((m) =>
        h(Box, { flexDirection: 'column', marginTop: 1, paddingLeft: 2 }, h(Text, { bold: true }, 'Asoka'), h(Markdown, { text: m.text })),
      ),
    )
  })
}
