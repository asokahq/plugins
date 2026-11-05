// Says who is signed in at session start, and puts /mcp in the prompt box while signed out.
const SERVER_KEY = 'asoka'
const SERVER_NAMES = ['plugin:asoka:asoka', 'plugin_asoka_asoka', 'asoka']
const SETUP = '/asoka:setup'
const SIGN_IN = '/mcp'
const SIGN_IN_NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

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

export function register(on) {
  on('session.start', async ($, e, next) => {
    if (e.isInteractive) await greet($)
    return next(e)
  })
}
