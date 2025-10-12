import { create } from 'zustand'

export type PresenceStatus = 'online' | 'idle' | 'offline'

export type Participant = {
  id: string
  name: string
  role: 'learner' | 'mentor' | 'admin'
  status: PresenceStatus
  avatarColor: string
  lastActive: string
}

export type ActivityEvent = {
  id: string
  type: 'project' | 'asset' | 'comment' | 'system'
  message: string
  timestamp: string
  actor?: Participant
  context?: {
    projectId?: string
    assetId?: string
  }
}

type PresenceState = {
  connected: boolean
  projectId?: string
  participants: Participant[]
  activities: ActivityEvent[]
  setConnected: (value: boolean, projectId?: string) => void
  setParticipants: (next: Participant[]) => void
  upsertParticipant: (participant: Participant) => void
  updateParticipant: (id: string, patch: Partial<Participant>) => void
  removeParticipant: (id: string) => void
  pushActivity: (event: ActivityEvent) => void
  clearActivities: () => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
  connected: false,
  participants: [],
  activities: [],
  setConnected: (value, projectId) =>
    set((state) => ({
      connected: value,
      projectId: projectId ?? state.projectId,
      ...(value ? {} : { participants: [] }),
    })),
  setParticipants: (participants) =>
    set(() => ({
      participants: participants
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),
  upsertParticipant: (participant) =>
    set((state) => {
      const existingIndex = state.participants.findIndex((p) => p.id === participant.id)
      let participants: Participant[]
      if (existingIndex >= 0) {
        participants = [...state.participants]
        participants[existingIndex] = { ...participants[existingIndex], ...participant }
      } else {
        participants = [...state.participants, participant]
      }
      participants.sort((a, b) => a.name.localeCompare(b.name))
      return { participants }
    }),
  updateParticipant: (id, patch) =>
    set((state) => ({
      participants: state.participants.map((participant) =>
        participant.id === id ? { ...participant, ...patch } : participant,
      ),
    })),
  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((participant) => participant.id !== id),
    })),
  pushActivity: (event) =>
    set((state) => ({ activities: [event, ...state.activities].slice(0, 30) })),
  clearActivities: () => set({ activities: [] }),
}))
