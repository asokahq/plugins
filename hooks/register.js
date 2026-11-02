// Says who is signed in at session start, then watches the Asoka requests this session
// sends: long-polls each one and wakes Claude only when Asoka has something to act on.
import { atom, read, update } from 'claude-code'

const SERVER_KEY = 'asoka'
const SERVER_NAMES = ['plugin:asoka:asoka', 'plugin_asoka_asoka', 'asoka']
const SETUP = '/asoka:setup'
const SIGN_IN = `Asoka: not signed in. Run /mcp, pick asoka and sign in, then ${SETUP}.`
// The names Claude Code lists the server's tools under, from either server spelling.
const SEND_MESSAGE = /^mcp__(plugin_asoka_asoka|asoka)__send_message$/
const GET_REQUEST = /^mcp__(plugin_asoka_asoka|asoka)__get_request$/
const WAIT_SECONDS = 45
const TICK_MS = 2000
const RATE_LIMIT_PAUSE_MS = 30000
// Statuses after which Asoka does nothing more until the user writes again, so watching
// stops; Claude's next send_message on the request starts it again.
const STOPPED = new Set(['idle', 'waiting_for_approval', 'done', 'failed'])
const watched = atom({ plugin: 'asoka', key: 'watched' }, {})

let server = ''
let timer = null
let canWake = false
let pausedUntilMs = 0
const inFlight = new Set()
let pendingText = null


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

const firstLine = (text) => String(text ?? '').split('\n').find((line) => line.trim()) ?? ''

function elapsed(sinceMs, nowMs) {
  const s = Math.max(0, Math.round((nowMs - sinceMs) / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const lastId = (messages) => (messages.length ? messages[messages.length - 1].id : null)

// Without a cursor the thread comes back whole; what Asoka said after the requester's
// latest message is what is new.
function newMessages(messages, after) {
  if (after) return messages
  let i = messages.length - 1
  while (i >= 0 && messages[i].from !== 'requester') i -= 1
  return messages.slice(i + 1)
}

async function forget($, requestId) {
  await update($, watched, (all) => {
    const next = { ...all }
    delete next[requestId]
    return next
  })
  if (!Object.keys(await read($, watched)).length) $.ui.status(undefined)
}

// What Claude's own calls taught us: a request it sent to, or where it has read up to.
async function noteToolCall($, e, result) {
  const payload = parseJson(textOf(result.result ?? result))
  if (!payload?.request_id) return
  const nowMs = await $.clock.now()
  await update($, watched, (all) => {
    const next = { ...all }
    const entry = next[payload.request_id]
    if (SEND_MESSAGE.test(e.tool)) {
      next[payload.request_id] = {
        title: entry?.title ?? firstLine(e.message).slice(0, 80),
        after: entry?.after ?? null,
        status: 'running',
        openedAtMs: entry?.openedAtMs ?? nowMs,
      }
    } else if (entry) {
      const after = lastId(payload.messages ?? []) ?? entry.after
      if (STOPPED.has(payload.status)) delete next[payload.request_id]
      else next[payload.request_id] = { ...entry, after, status: payload.status ?? entry.status }
    }
    return next
  })
}

async function submitPrompt($, text) {
  let reason
  try {
    const result = await $.prompt.submit({ text })
    reason = result?.drop ?? ''
  } catch (error) {
    reason = String(error?.message ?? error)
  }
  if (
    reason.includes('the session was stopped and nobody has sent input since') ||
    reason.includes('was removed from the queue before it ran')
  ) {
    pendingText = text
  }
}

function stopWatching() {
  if (timer) timer.cancel()
  timer = null
}

async function poll($, requestId) {
  inFlight.add(requestId)
  try {
    const entry = (await read($, watched))[requestId]
    if (!entry) return
    let payload
    try {
      const args = { request_id: requestId, wait_seconds: WAIT_SECONDS }
      if (entry.after) args.after = entry.after
      payload = parseJson(textOf(await call($, 'get_request', args)))
    } catch {
      payload = null
    }
    if (!payload) {
      $.ui.status(SIGN_IN)
      stopWatching()
      return
    }
    if (payload.error === 'rate_limited') {
      pausedUntilMs = (await $.clock.now()) + RATE_LIMIT_PAUSE_MS
      return
    }
    if (payload.error) {
      $.ui.status(`Asoka: ${payload.message ?? payload.error}`)
      await forget($, requestId)
      return
    }
    const messages = payload.messages ?? []
    const fresh = newMessages(messages, entry.after)
    const status = payload.status ?? entry.status
    const fromAsoka = fresh.filter((m) => m.from === 'asoka')
    const asked = fromAsoka.some((m) => Array.isArray(m.questions) && m.questions.length)
    const stopped = status !== entry.status && STOPPED.has(status)
    const nowMs = await $.clock.now()
    const latest = fromAsoka.length ? fromAsoka[fromAsoka.length - 1] : null
    if (asked || stopped) {
      const from = entry.after ? ` with after: "${entry.after}"` : ''
      const ask = asked ? 'Asoka has a question for the user.' : `Asoka's request is now ${status}.`
      await submitPrompt(
        $,
        `${ask} Request "${entry.title}" (request_id ${requestId}). Read only the new messages with get_request(request_id: "${requestId}"${from}) and report them, or put Asoka's question to the user.`,
      )
      await forget($, requestId)
      return
    }
    if (latest) $.ui.status(`Asoka · ${status} · ${elapsed(entry.openedAtMs, nowMs)} · ${firstLine(latest.text)}`)
    await update($, watched, (all) => {
      const next = { ...all }
      if (next[requestId]) next[requestId] = { ...next[requestId], after: lastId(messages) ?? entry.after, status }
      return next
    })
  } finally {
    inFlight.delete(requestId)
  }
}

async function tick($) {
  if ((await $.clock.now()) < pausedUntilMs) return
  const all = await read($, watched)
  for (const requestId of Object.keys(all)) {
    if (!inFlight.has(requestId)) void poll($, requestId)
  }
}

const WATCHER_SECTION =
  'The asoka plugin watches the Asoka requests opened in this session. After send_message ' +
  'returns, tell the user in one line that Asoka has the request and end the turn: the plugin ' +
  'long-polls get_request and starts a new turn when Asoka asks a question or finishes. Do ' +
  'not call get_request in a loop or sleep between calls.'

export function register(on) {
  on('session.start', async ($, e, next) => {
    await greet($)
    try {
      canWake = (await $.session.surfaces()).length > 0
    } catch {
      canWake = false
    }
    if (canWake && !timer) timer = $.clock.every(TICK_MS, () => void tick($))
    return next(e)
  })

  on('tool.call', { tool: [SEND_MESSAGE, GET_REQUEST] }, async ($, e, next) => {
    const result = await next(e)
    if (canWake && !result.deny && !result.isError) await noteToolCall($, e, result)
    return result
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!canWake) return composed
    const sections = [...(composed?.sections ?? []), { id: 'asoka-watcher', text: WATCHER_SECTION, scope: 'session' }]
    return { ...composed, sections }
  })

  on('turn.complete', async ($, e, next) => {
    if (pendingText) {
      const text = pendingText
      pendingText = null
      void submitPrompt($, text)
    }
    return next(e)
  })
}
