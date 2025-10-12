import { beforeEach, describe, expect, it } from 'vitest'
import { usePresenceStore, type Participant } from '../src/store/presenceStore'

describe('presence store', () => {
  beforeEach(() => {
    usePresenceStore.setState({ connected: false, participants: [], activities: [] })
  })

  const sampleParticipant: Participant = {
    id: 'p-1',
    name: 'Mentor Asha',
    role: 'mentor',
    status: 'online',
    avatarColor: '#fff',
    lastActive: new Date().toISOString(),
  }

  it('upserts and removes participants', () => {
    usePresenceStore.getState().upsertParticipant(sampleParticipant)
    expect(usePresenceStore.getState().participants).toHaveLength(1)

    usePresenceStore.getState().updateParticipant('p-1', { status: 'idle' })
    expect(usePresenceStore.getState().participants[0].status).toBe('idle')

    usePresenceStore.getState().removeParticipant('p-1')
    expect(usePresenceStore.getState().participants).toHaveLength(0)
  })

  it('caps activity list to last 30 entries', () => {
    for (let i = 0; i < 40; i += 1) {
      usePresenceStore.getState().pushActivity({
        id: `act-${i}`,
        type: 'project',
        message: `Event ${i}`,
        timestamp: new Date().toISOString(),
      })
    }
    expect(usePresenceStore.getState().activities).toHaveLength(30)
  })
})
