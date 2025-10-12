import React, { useState } from 'react'
import { useFilesStore, type AssetType } from '../../store/filesStore'
import TextDiffViewer from './TextDiffViewer'
import { humanSize } from '../../utils/previews'

const formatTime = (iso: string) => new Date(iso).toLocaleString()

type Props = {
  assetId: string
  currentSnippet?: string
  type: AssetType
  currentSize: number
  currentMime: string
  enableDiff: boolean
}

export default function AssetVersionList({ assetId, currentSnippet, type, currentSize, currentMime, enableDiff }: Props) {
  const versions = useFilesStore((s) => s.getVersions(assetId))
  const [openVersion, setOpenVersion] = useState<string | null>(null)
  const [openMeta, setOpenMeta] = useState<string | null>(null)
  if (!versions.length) return null

  const latestSummary = versions[0]?.diffSummary

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <div className="flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide text-slate-500">Version history</span>
        {latestSummary && <span className="text-slate-400">{latestSummary}</span>}
      </div>
      <ul className="mt-2 space-y-2">
        {versions.slice(0, 5).map((version) => {
          const isOpen = openVersion === version.id
          return (
            <li key={version.id} className="rounded-xl border border-transparent px-2 py-1 hover:border-slate-300">
              <div className="flex items-center justify-between">
                <span>v{version.version}</span>
                <div className="flex items-center gap-2">
                  <span>{formatTime(version.createdAt)}</span>
                  {(type === 'text' || type === 'code') && enableDiff ? (
                    <button
                      type="button"
                      className="rounded-full border px-2 py-1 text-xs"
                      onClick={() => setOpenVersion(isOpen ? null : version.id)}
                    >
                      {isOpen ? 'Hide diff' : 'View diff'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-full border px-2 py-1 text-xs"
                      onClick={() => setOpenMeta(openMeta === version.id ? null : version.id)}
                    >
                      {openMeta === version.id ? 'Hide metadata' : 'View metadata'}
                    </button>
                  )}
                </div>
              </div>
              {enableDiff && isOpen && currentSnippet && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900">
                  <TextDiffViewer previousVersion={version} currentSnippet={currentSnippet} />
                </div>
              )}
              {openMeta === version.id && type !== 'text' && type !== 'code' && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="px-2 py-1">Field</th>
                        <th className="px-2 py-1">Previous</th>
                        <th className="px-2 py-1">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1 font-semibold">Size</td>
                        <td className="px-2 py-1">{humanSize(version.size)}</td>
                        <td className="px-2 py-1">{humanSize(currentSize)}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 font-semibold">MIME</td>
                        <td className="px-2 py-1">{version.mime}</td>
                        <td className="px-2 py-1">{currentMime}</td>
                      </tr>
                      {version.diffSummary && (
                        <tr>
                          <td className="px-2 py-1 font-semibold">Summary</td>
                          <td className="px-2 py-1" colSpan={2}>{version.diffSummary}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
