import { expect, mock, test } from 'claude-code/testing'

const asText = (payload: unknown) => ({
  value: { content: [{ type: 'text', text: JSON.stringify(payload) }], isError: false },
})

function session(on: any, stored: string | undefined) {
  const saved: any[] = []
  const toasts: string[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('store.get', () => ({ value: stored }))
  on('store.set', ($: any, e: any) => {
    saved.push(e)
    return { value: undefined }
  })
  on('ui.toast', ($: any, e: any) => {
    toasts.push(e.text ?? e.message ?? JSON.stringify(e))
    return { value: undefined }
  })
  return { saved, toasts }
}

test('the first session says who is signed in and points at setup', async ($, on) => {
  mock.clock(on)
  const { saved, toasts } = session(on, undefined)
  const calls: any[] = []
  on('mcp.call', ($, e) => {
    calls.push(e)
    return asText({ org: 'Acme Robotics', email: 'a@x.com', enabled: true })
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  expect(calls[0]).toMatchObject({ server: 'plugin:asoka:asoka', tool: 'setup' })
  expect(saved[0]).toMatchObject({ key: 'greeted', value: 'a@x.com' })
  expect(toasts[0]).toBe(
    'Signed in to Asoka as a@x.com at Acme Robotics. Run /asoka:setup to see what Asoka does for Acme Robotics.',
  )
})

test('a later session for the same account says nothing', async ($, on) => {
  mock.clock(on)
  const { saved, toasts } = session(on, 'a@x.com')
  on('mcp.call', () => asText({ org: 'Acme Robotics', email: 'a@x.com', enabled: true }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  expect(saved).toHaveLength(0)
  expect(toasts).toHaveLength(0)
})

test('an organization without the MCP server switched on is told whom to ask', async ($, on) => {
  mock.clock(on)
  const { toasts } = session(on, undefined)
  on('mcp.call', () => asText({ org: 'Acme Robotics', email: 'a@x.com', enabled: false }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  expect(toasts[0]).toBe('Signed in to Asoka at Acme Robotics, but Asoka is not switched on for it yet. Ask your Asoka admin.')
})

test('a session that is not signed in says how to sign in', async ($, on) => {
  mock.clock(on)
  const { saved, toasts } = session(on, undefined)
  on('mcp.call', () => {
    throw new Error('no connected MCP tool')
  })
  on('mcp.connect', () => ({ value: { isConnected: false, reason: 'auth', message: 'not signed in' } }))
  const fills: any[] = []
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }))
  on('prompt.fill', ($, e) => {
    fills.push(e)
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  expect(saved[0]).toMatchObject({ key: 'sign_in_nudged_at' })
  expect(fills[0]).toMatchObject({ text: '/mcp' })
  expect(toasts[0]).toBe('Asoka is not connected yet. Press Enter, pick asoka and sign in, then run /asoka:setup.')
})
