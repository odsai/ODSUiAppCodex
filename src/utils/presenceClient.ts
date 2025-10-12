import {
  usePresenceStore,
  type Participant,
  type ActivityEvent,
  type PresenceStatus,
} from '../store/presenceStore'

type PresenceClientOptions = {
  projectId?: string
  user?: { id: string; name: string; role: Participant['role'] }
}

type PresenceMessage =
  | { kind: 'join'; participant: Participant; projectId?: string }
  | { kind: 'leave'; participantId: string; projectId?: string }
  | { kind: 'status'; participantId: string; status: PresenceStatus; lastActive: string; projectId?: string }
  | { kind: 'activity'; event: ActivityEvent; projectId?: string }
  | { kind: 'sync-request'; projectId?: string }
  | { kind: 'sync-state'; participants: Participant[]; projectId?: string }

const CHANNEL_NAME = 'odsui.presence.v1'
const COLORS = ['#F97316', '#22D3EE', '#A855F7', '#14B8A6', '#FACC15', '#38BDF8', '#F472B6', '#10B981']
const SELF_IDLE_AFTER_MS = 90_000
const SELF_OFFLINE_AFTER_MS = 180_000

let channel: BroadcastChannel | null = null
let heartbeatTimer: number | null = null
let demoTimer: number | null = null
let idleTimer: number | null = null
let offlineTimer: number | null = null
let currentParticipant: Participant | null = null
let currentProjectId: string | undefined
let warnedBroadcastFallback = false

const generateId = () => `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`

const randomColor = (seed: string) => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % COLORS.length
  return COLORS[index]
}

const supportsChannels = () => typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'

const matchesProject = (messageProjectId?: string) => messageProjectId === undefined || messageProjectId === currentProjectId

const broadcast = (message: PresenceMessage) => {
  if (!channel) return
  try {
    channel.postMessage(message)
  } catch {
    // swallow for unsupported environments
  }
}

const applyParticipants = (participants: Participant[]) => {
  participants.forEach((participant) => {
    usePresenceStore.getState().upsertParticipant(participant)
  })
}

const handleMessage = (message: PresenceMessage) => {
  if (!matchesProject(message.projectId)) return
  if (!usePresenceStore.getState().connected) return
  const store = usePresenceStore.getState()
  switch (message.kind) {
    case 'join':
      store.upsertParticipant(message.participant)
      broadcast({
        kind: 'sync-state',
        participants: store.participants,
        projectId: currentProjectId,
      })
      break
    case 'leave':
      store.removeParticipant(message.participantId)
      break
    case 'status':
      store.updateParticipant(message.participantId, {
        status: message.status,
        lastActive: message.lastActive,
      })
      break
    case 'activity':
      store.pushActivity(message.event)
      if (message.event.actor) {
        store.upsertParticipant({
          ...message.event.actor,
          status: message.event.actor.status ?? 'online',
          lastActive: message.event.timestamp,
        } as Participant)
      }
      break
    case 'sync-request':
      broadcast({
        kind: 'sync-state',
        participants: store.participants,
        projectId: currentProjectId,
      })
      break
    case 'sync-state':
      applyParticipants(message.participants)
      break
    default:
      break
  }
}

const setupChannel = () => {
  if (!supportsChannels()) return null
  const instance = new BroadcastChannel(CHANNEL_NAME)
  instance.onmessage = (event) => {
    const payload = event.data as PresenceMessage
    if (!payload) return
    handleMessage(payload)
  }
  return instance
}

const teardownTimers = () => {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (demoTimer) {
    window.clearInterval(demoTimer)
    demoTimer = null
  }
}

const clearSelfStatusTimers = () => {
  if (idleTimer) {
    window.clearTimeout(idleTimer)
    idleTimer = null
  }
  if (offlineTimer) {
    window.clearTimeout(offlineTimer)
    offlineTimer = null
  }
}

const scheduleSelfStatusTimers = () => {
  if (typeof window === 'undefined' || !currentParticipant) return
  clearSelfStatusTimers()
  idleTimer = window.setTimeout(() => {
    const now = new Date().toISOString()
    usePresenceStore.getState().updateParticipant(currentParticipant!.id, {
      status: 'idle',
      lastActive: now,
    })
    if (supportsChannels() && currentProjectId) {
      broadcast({
        kind: 'status',
        participantId: currentParticipant!.id,
        status: 'idle',
        lastActive: now,
        projectId: currentProjectId,
      })
    }
  }, SELF_IDLE_AFTER_MS)

  offlineTimer = window.setTimeout(() => {
    const now = new Date().toISOString()
    usePresenceStore.getState().updateParticipant(currentParticipant!.id, {
      status: 'offline',
      lastActive: now,
    })
    if (supportsChannels() && currentProjectId) {
      broadcast({
        kind: 'status',
        participantId: currentParticipant!.id,
        status: 'offline',
        lastActive: now,
        projectId: currentProjectId,
      })
    }
  }, SELF_OFFLINE_AFTER_MS)
}

const startDemoTimer = (projectId?: string) => {
  if (demoTimer || typeof window === 'undefined') return
  demoTimer = window.setInterval(() => {
    const participants = usePresenceStore.getState().participants
    const others = participants.filter((participant) => participant.id !== currentParticipant?.id)
    const actor = others[Math.floor(Math.random() * others.length)]
    const event: ActivityEvent = {
      id: generateId(),
      type: 'comment',
      message: actor
        ? `${actor.name} left new feedback on “Prototype Links”.`
        : 'Collaborator left feedback on “Prototype Links”.',
      timestamp: new Date().toISOString(),
      actor,
      context: { projectId },
    }
    usePresenceStore.getState().pushActivity(event)
    if (actor) {
      usePresenceStore.getState().updateParticipant(actor.id, {
        status: 'online',
        lastActive: event.timestamp,
      })
    }
    if (supportsChannels()) {
      broadcast({ kind: 'activity', event, projectId })
    }
  }, 60_000)
}

export const startPresenceClient = (options: PresenceClientOptions = {}) => {
  if (typeof window === 'undefined') return
  const store = usePresenceStore.getState()
  if (store.connected) return

  currentProjectId = options.projectId
  const id = options.user?.id || 'self'
  const self: Participant = {
    id,
    name: options.user?.name || 'You',
    role: options.user?.role || 'learner',
    status: 'online',
    avatarColor: randomColor(id),
    lastActive: new Date().toISOString(),
  }
  currentParticipant = self

  usePresenceStore.getState().setConnected(true, currentProjectId)
  usePresenceStore.getState().upsertParticipant(self)

  if (supportsChannels()) {
    channel = setupChannel()
    broadcast({ kind: 'join', participant: self, projectId: currentProjectId })
    broadcast({ kind: 'sync-request', projectId: currentProjectId })
    heartbeatTimer = window.setInterval(() => {
      const now = new Date().toISOString()
      usePresenceStore.getState().updateParticipant(self.id, { lastActive: now, status: 'online' })
      broadcast({
        kind: 'status',
        participantId: self.id,
        status: 'online',
        lastActive: now,
        projectId: currentProjectId,
      })
      scheduleSelfStatusTimers()
    }, 30_000)
  } else {
    // Fallback: seed with local mock data
    if (!warnedBroadcastFallback) {
      warnedBroadcastFallback = true
      console.warn(
        '[presence] BroadcastChannel unavailable; using local mock transport. Consider adding telemetry for ops visibility.',
      )
    }
    const mockMentor: Participant = {
      id: 'mentor-asha',
      name: 'Mentor Asha',
      role: 'mentor',
      status: 'online',
      avatarColor: randomColor('mentor-asha'),
      lastActive: new Date(Date.now() - 45_000).toISOString(),
    }
    const mockPeer: Participant = {
      id: 'peer-rahul',
      name: 'Peer Rahul',
      role: 'learner',
      status: 'idle',
      avatarColor: randomColor('peer-rahul'),
      lastActive: new Date(Date.now() - 5 * 60_000).toISOString(),
    }
    applyParticipants([self, mockMentor, mockPeer])
  }

  // Seed baseline activity for UX demos
  const seedActivities: ActivityEvent[] = [
    {
      id: generateId(),
      type: 'project',
      message: 'Mentor Asha reviewed “Responsible AI Workflow”.',
      timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
      actor: currentParticipant,
      context: { projectId: options.projectId },
    },
    {
      id: generateId(),
      type: 'asset',
      message: 'Peer Rahul uploaded “usability-findings.md”.',
      timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
      context: { projectId: options.projectId },
    },
  ]
  seedActivities.forEach((event) => usePresenceStore.getState().pushActivity(event))
  scheduleSelfStatusTimers()
  startDemoTimer(options.projectId)
}

export const stopPresenceClient = () => {
  if (typeof window === 'undefined') return
  if (!usePresenceStore.getState().connected) return

  if (supportsChannels() && channel && currentParticipant) {
    broadcast({ kind: 'leave', participantId: currentParticipant.id, projectId: currentProjectId })
    channel.onmessage = null
    channel.close()
  }
  channel = null
  teardownTimers()
  clearSelfStatusTimers()
  currentParticipant = null
  currentProjectId = undefined
  usePresenceStore.getState().setConnected(false)
  usePresenceStore.getState().clearActivities()
}

export const emitMockActivity = (partial: Pick<ActivityEvent, 'type' | 'message'> & Partial<ActivityEvent>) => {
  const timestamp = partial.timestamp ?? new Date().toISOString()
  const event: ActivityEvent = {
    id: partial.id ?? generateId(),
    type: partial.type,
    message: partial.message,
    timestamp,
    actor: partial.actor,
    context: partial.context,
  }
  usePresenceStore.getState().pushActivity(event)
  if (event.actor) {
    usePresenceStore.getState().updateParticipant(event.actor.id, {
      status: 'online',
      lastActive: timestamp,
    })
  } else if (currentParticipant) {
    scheduleSelfStatusTimers()
  }
  if (supportsChannels() && currentProjectId) {
    broadcast({ kind: 'activity', event, projectId: currentProjectId })
  }
}
