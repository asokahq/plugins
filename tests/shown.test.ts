import { expect, test } from 'claude-code/testing'

const GET_REQUEST = 'mcp__plugin_asoka_asoka__get_request'
const REMINDER =
  "The user's editor has already shown the text of Asoka's messages from this get_request result, in full, " +
  'under the call. It has not shown their questions.'

function answers(on: any, payload: unknown, surfaces: string[]) {
  const text = JSON.stringify(payload)
  on('tool.call', () => ({ result: { content: [{ type: 'text', text }] }, text }))
  on('session.surfaces', () => ({ value: surfaces }))
}

const answered = {
  request_id: 'r1',
  status: 'idle',
  messages: [{ id: 'm2', from: 'asoka', text: 'You have 248 Cases.' }],
}

test('a read that brings Asoka a message tells Claude the editor showed it', async ($, on) => {
  answers(on, answered, ['terminal'])
  const result = await $.tool.call({ tool: GET_REQUEST, request_id: 'r1', after: 'm1' })

  expect(result.context).toEqual([REMINDER])
})

test('with nothing drawing the session, Claude gets no reminder and quotes the message', async ($, on) => {
  answers(on, answered, [])
  const result = await $.tool.call({ tool: GET_REQUEST, request_id: 'r1', after: 'm1' })

  expect(result.context ?? []).toEqual([])
})

test('a read with no new Asoka message gets no reminder', async ($, on) => {
  answers(
    on,
    { request_id: 'r1', status: 'running', messages: [{ id: 'm1', from: 'requester', text: 'How many Cases?' }] },
    ['terminal'],
  )
  const result = await $.tool.call({ tool: GET_REQUEST, request_id: 'r1' })

  expect(result.context ?? []).toEqual([])
})
