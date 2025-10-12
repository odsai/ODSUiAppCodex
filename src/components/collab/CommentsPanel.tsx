import React, { useEffect, useMemo, useState } from 'react'
import { useCommentsStore } from '../../store/commentsStore'
import { useAppStore } from '../../store/appStore'
import { usePresenceStore } from '../../store/presenceStore'
import { extractMentions } from '../../utils/mentions'

const formatRelative = (iso: string) => {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

type Target = { type: 'project' | 'asset'; id: string }

export default function CommentsPanel({ target }: { target?: Target }) {
  const user = useAppStore((s) => s.user)
  const threads = useCommentsStore((s) => s.threads)
  const createThread = useCommentsStore((s) => s.createThread)
  const addComment = useCommentsStore((s) => s.addComment)
  const toggleResolved = useCommentsStore((s) => s.toggleResolved)
  const fetchThreads = useCommentsStore((s) => s.fetchThreads)
  const participants = usePresenceStore((s) => s.participants)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const filtered = useMemo(() => {
    if (!target) return threads.slice(0, 5)
    return threads.filter((thread) => thread.target.type === target.type && thread.target.id === target.id)
  }, [threads, target])

  const author = useMemo(() => {
    if (!user) {
      return { id: 'guest', name: 'Guest', role: 'learner' as const }
    }
    const role = user.roles?.includes('admin')
      ? 'admin'
      : user.roles?.includes('mentor')
      ? 'mentor'
      : 'learner'
    return { id: user.id, name: user.name, role }
  }, [user])

  useEffect(() => {
    if (target?.id) fetchThreads({ id: target.id, type: target.type })
  }, [target?.id, target?.type, fetchThreads])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    if (!trimmedTitle || !trimmedBody) return
    const mentionNames = extractMentions(trimmedBody).map((mention) => mention.toLowerCase())
    const mentions = participants
      .filter((participant) => {
        const lower = participant.name.toLowerCase()
        return mentionNames.some((mention) => lower.includes(mention))
      })
      .map((participant) => ({ id: participant.id, name: participant.name, role: participant.role }))
    const comment = {
      id: `comment_${Math.random().toString(36).slice(2, 10)}`,
      body: trimmedBody,
      createdAt: new Date().toISOString(),
      author,
      mentions,
    }
    const targetRef = target ?? { type: 'project' as const, id: 'global' }
    createThread({ target: targetRef, title: trimmedTitle, initialComment: comment })
    setTitle('')
    setBody('')
  }

  const handleReply = (threadId: string, reply: string) => {
    const trimmed = reply.trim()
    if (!trimmed) return
    const mentionNames = extractMentions(trimmed).map((mention) => mention.toLowerCase())
    const mentions = participants
      .filter((participant) => {
        const lower = participant.name.toLowerCase()
        return mentionNames.some((mention) => lower.includes(mention))
      })
      .map((participant) => ({ id: participant.id, name: participant.name, role: participant.role }))
    addComment(threadId, {
      id: `comment_${Math.random().toString(36).slice(2, 10)}`,
      body: trimmed,
      createdAt: new Date().toISOString(),
      author,
      mentions,
    })
  }

  return (
    <div className="rounded-3xl border border-slate-200 p-5 shadow-sm dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Discussion</h3>
        {target && (
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {target.type === 'asset' ? 'Asset thread' : 'Project thread'}
          </span>
        )}
      </div>
      <form className="mt-4 space-y-2" onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Start a new thread"
          className="w-full rounded-2xl border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a note, question, or critique"
          className="h-20 w-full rounded-2xl border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!title.trim() || !body.trim()}
          >
            Post
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300/80">
            No discussions yet. Start one to invite feedback from collaborators.
          </p>
        ) : (
          filtered.map((thread) => <ThreadCard key={thread.id} threadId={thread.id} onReply={handleReply} onToggleResolved={toggleResolved} />)
        )}
      </div>
    </div>
  )
}

const ThreadCard = ({
  threadId,
  onReply,
  onToggleResolved,
}: {
  threadId: string
  onReply: (threadId: string, reply: string) => void
  onToggleResolved: (threadId: string, resolved: boolean) => void
}) => {
  const thread = useCommentsStore((s) => s.threads.find((t) => t.id === threadId))
  const [reply, setReply] = useState('')

  if (!thread) return null

  return (
    <div className="rounded-3xl border border-slate-200 p-4 shadow-sm dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{thread.title}</h4>
        <button
          type="button"
          onClick={() => onToggleResolved(thread.id, !thread.resolved)}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            thread.resolved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {thread.resolved ? 'Resolved' : 'Open'}
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {thread.comments.map((comment) => (
          <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-600 dark:text-slate-200">{comment.author.name}</span>
              <span>{formatRelative(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-slate-700 dark:text-slate-100">{comment.body}</p>
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onReply(thread.id, reply)
          setReply('')
        }}
      >
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply…"
          className="flex-1 rounded-2xl border px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!reply.trim()}
        >
          Send
        </button>
      </form>
    </div>
  )
}
