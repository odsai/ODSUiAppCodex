import React, { useMemo, useRef } from 'react'
import { useFilesStore } from '../../store/filesStore'
import FileCard from './FileCard'
import { humanSize } from '../../utils/previews'

export type FileBrowserOptions = {
  enablePreviews: boolean
  maxPreviewSizeMb: number
  enableDiff: boolean
  showVersionHistory: boolean
}

const DEFAULT_OPTIONS: FileBrowserOptions = {
  enablePreviews: true,
  maxPreviewSizeMb: 25,
  enableDiff: true,
  showVersionHistory: true,
}

export default function FileBrowser({
  projectId,
  onDiscuss,
  options,
}: {
  projectId?: string
  onDiscuss?: (assetId: string) => void
  options?: Partial<FileBrowserOptions>
}) {
  const assets = useFilesStore((s) => s.assets)
  const view = useFilesStore((s) => s.view)
  const query = useFilesStore((s) => s.query)
  const setView = useFilesStore((s) => s.setView)
  const setQuery = useFilesStore((s) => s.setQuery)
  const addFiles = useFilesStore((s) => s.addFiles)
  const removeAsset = useFilesStore((s) => s.removeAsset)
  const resolvedOptions: FileBrowserOptions = { ...DEFAULT_OPTIONS, ...options }

  const inputRef = useRef<HTMLInputElement | null>(null)

  const filtered = useMemo(() => {
    const list = projectId ? assets.filter((a) => a.projectId === projectId) : assets
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => a.name.toLowerCase().includes(q) || (a.tags || []).some((t) => t.toLowerCase().includes(q)))
  }, [assets, projectId, query])

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    await addFiles(Array.from(files), projectId)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name or tag"
            className="w-64 rounded-full border px-4 py-2 text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setView('grid')}
            className={`rounded-full px-3 py-1 text-sm ${view === 'grid' ? 'bg-brand text-white' : 'border'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-full px-3 py-1 text-sm ${view === 'list' ? 'bg-brand text-white' : 'border'}`}
          >
            List
          </button>
          <input ref={inputRef} className="hidden" type="file" multiple onChange={(e) => onPickFiles(e.target.files)} />
          <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white" onClick={() => inputRef.current?.click()}>
            Add files
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
          <p className="font-medium">No files yet</p>
          <p className="text-sm">Add files to this project to see instant previews.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <FileCard
              key={asset.id}
              asset={asset}
              onRemove={removeAsset}
              onDiscuss={onDiscuss ? () => onDiscuss(asset.id) : undefined}
              options={resolvedOptions}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Version</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Size</th>
                <th className="px-2 py-2">Updated</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-2 py-2">
                    <div className="max-w-[420px] truncate" title={a.name}>{a.name}</div>
                  </td>
                  <td className="px-2 py-2">v{a.version}</td>
                  <td className="px-2 py-2">{a.type}</td>
                  <td className="px-2 py-2">{humanSize(a.size)}</td>
                  <td className="px-2 py-2">{new Date(a.updatedAt).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {onDiscuss && (
                        <button className="rounded border px-2 py-1" onClick={() => onDiscuss(a.id)}>Discuss</button>
                      )}
                      <button className="rounded border px-2 py-1" onClick={() => removeAsset(a.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
