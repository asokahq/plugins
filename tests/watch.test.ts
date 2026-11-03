import { expect, mock, test } from 'claude-code/testing'

const asText = (payload: unknown) => ({
  value: { content: [{ type: 'text', text: JSON.stringify(payload) }], isError: false },
})
const toolResult = (payload: unknown) => ({
  result: { content: [{ type: 'text', text: JSON.stringify(payload) }] },
})
const SEND = 'mcp__plugin_asoka_asoka__send_message'
const COMPOSE = { model: 'claude-test', promptModel: 'claude-test', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as any
const GET = 'mcp__plugin_asoka_asoka__get_request'

// A session that is signed in, can be woken, and answers get_request from `replies` in order.
function session(on: any, replies: any[]) {
  const polls: any[] = []
  const statuses: (string | undefined)[] = []
  const prompts: string[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('session.surfaces', () => ({ value: ['terminal'] }))
  on('store.get', () => ({ value: 'a@x.com' }))
  on('store.set', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [] }))
  on('ui.status', ($: any, e: any) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', ($: any, e: any) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  on('mcp.call', ($: any, e: any) => {
    if (e.tool === 'setup') return asText({ org: 'Acme', email: 'a@x.com', enabled: true })
    polls.push(e.args ?? e.arguments ?? e)
    const reply = replies.shift()
    return reply?.deny ? reply : asText(reply)
  })
  on('tool.call', ($: any, e: any) => {
    if (e.tool === SEND) return toolResult({ request_id: 'r1', action: 'opened' })
    return toolResult({
      request_id: 'r1',
      status: 'running',
      messages: [{ id: 'm1', from: 'requester', text: e.message ?? '', at: 't' }],
    })
  })
  return { polls, statuses, prompts }
}

test('a running request updates the status line and wakes Claude once when Asoka asks', async ($, on) => {
  const clock = mock.clock(on)
  const { polls, statuses, prompts } = session(on, [
    { request_id: 'r1', status: 'running', messages: [{ id: 'm1', from: 'requester', text: 'Why?' }, { id: 'm2', from: 'asoka', text: 'Looking at the flow.\nmore' }] },
    { request_id: 'r1', status: 'running', messages: [] },
    { request_id: 'r1', status: 'idle', messages: [{ id: 'm3', from: 'asoka', text: 'Which org?', questions: [{ text: 'Which org?' }] }] },
  ])
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.tool.call({ tool: SEND, message: 'Why does the Stage reset?\nDetails follow.' })

  await clock.advance(5000)
  await clock.advance(5000)
  await clock.advance(5000)

  expect(polls[0]).toEqual({ request_id: 'r1' })
  expect(polls[1]).toEqual({ request_id: 'r1', after: 'm2' })
  expect(statuses[0]).toBe('Asoka · running · 0s · Why does the Stage reset?')
  expect(statuses[1]).toBe('Asoka · running · 5s · Looking at the flow.')
  expect(prompts).toHaveLength(1)
  expect(prompts[0]).toBe('Asoka has a question on "Why does the Stage reset?"')
  const wake = (await $.prompt.compose(COMPOSE)).sections.find((s: any) => s.id === 'asoka-wakes')
  expect(wake?.text).toContain('get_request(request_id: "r1", after: "m2")')
  await $.tool.call({ tool: GET, request_id: 'r1', after: 'm2' })
  const read = (await $.prompt.compose(COMPOSE)).sections.map((s: any) => s.id)
  expect(read).not.toContain('asoka-wakes')
  expect(statuses[statuses.length - 1]).toBeUndefined()
  await clock.advance(10000)
  expect(polls.length).toBe(3)
})

test('Claude reading the request itself moves the cursor and a finished request stops the poll', async ($, on) => {
  const clock = mock.clock(on)
  const { polls, prompts } = session(on, [{ request_id: 'r1', status: 'done', messages: [{ id: 'm9', from: 'asoka', text: 'Done.' }] }])
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.tool.call({ tool: SEND, message: 'Add a field' })
  await $.tool.call({ tool: GET, request_id: 'r1' })

  await clock.advance(5000)
  expect(polls[0]).toEqual({ request_id: 'r1', after: 'm1' })
  expect(prompts).toHaveLength(1)
  expect(prompts[0]).toBe('Asoka finished "Add a field"')
  await clock.advance(10000)
  expect(polls).toHaveLength(1)
})

test('a failing call says how to sign in and stops polling', async ($, on) => {
  const clock = mock.clock(on)
  const { polls, statuses, prompts } = session(on, [{ deny: 'invalid_token' }])
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.tool.call({ tool: SEND, message: 'Add a field' })

  await clock.advance(5000)
  await clock.advance(10000)
  expect(polls).toHaveLength(1)
  expect(statuses).toEqual([
    'Asoka · running · 0s · Add a field',
    'Asoka: not signed in. Run /mcp, pick asoka and sign in, then /asoka:setup.',
  ])
  expect(prompts).toHaveLength(0)
})

test('without a surface to wake, nothing is watched and the prompt section is left out', async ($, on) => {
  mock.clock(on)
  const polls: any[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('session.surfaces', () => ({ value: [] }))
  on('store.get', () => ({ value: 'a@x.com' }))
  on('ui.toast', () => ({ value: undefined }))
  on('mcp.call', ($: any, e: any) => {
    if (e.tool !== 'setup') polls.push(e)
    return asText({ org: 'Acme', email: 'a@x.com', enabled: true })
  })
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'base', scope: 'session' }] }))
  await $.session.start({ surface: 'terminal', isInteractive: false, cwd: '/work' })
  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.map((s: any) => s.id)).toEqual(['base'])
  expect(polls).toHaveLength(0)
})
