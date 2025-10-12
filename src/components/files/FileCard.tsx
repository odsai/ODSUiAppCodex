import React from 'react'
import type { Asset } from '../../store/filesStore'
import { humanSize, iconForType } from '../../utils/previews'
import AssetVersionList from './AssetVersionList'
import type { FileBrowserOptions } from './FileBrowser'

const DEFAULT_OPTIONS: FileBrowserOptions = {
  enablePreviews: true,
  maxPreviewSizeMb: 25,
  enableDiff: true,
  showVersionHistory: true,
}

export default function FileCard({
  asset,
  onRemove,
  onDiscuss,
  options,
}: {
  asset: Asset
  onRemove?: (id: string) => void
  onDiscuss?: (asset: Asset) => void
  options?: FileBrowserOptions
}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const previewByteLimit = config.maxPreviewSizeMb * 1024 * 1024
  const allowPreview = config.enablePreviews && asset.size <= previewByteLimit

  const placeholder = (
    <div className="flex h-full items-center justify-center text-4xl text-slate-300 dark:text-slate-600">
      {iconForType(asset.type)}
    </div>
  )

  return (
    <div className="surface-card group relative flex flex-col overflow-hidden rounded-2xl border p-3 shadow-sm">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/60">
        {allowPreview ? (
          <>
            {asset.type === 'image' && asset.url && (
              <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
            )}
            {asset.type === 'video' && asset.url && (
              <video src={asset.url} className="h-full w-full object-cover" muted controls />
            )}
            {asset.type === 'audio' && asset.url && (
              <div className="flex h-full items-center justify-center p-3">
                <audio src={asset.url} controls className="w-full" />
              </div>
            )}
            {asset.type === 'pdf' && asset.url && (
              <iframe src={asset.url} title={asset.name} className="h-full w-full" />
            )}
            {['text', 'code', 'model3d', 'other'].includes(asset.type) && placeholder}
          </>
        ) : (
          placeholder
        )}
      </div>
      <div className="mt-2">
        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={asset.name}>
          {asset.name}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          v{asset.version} • {humanSize(asset.size)} • {new Date(asset.updatedAt).toLocaleString()}
        </div>
        {asset.textSnippet && (
          <pre className="mt-2 max-h-24 overflow-hidden rounded bg-slate-50 p-2 text-xs dark:bg-slate-800">
            {asset.textSnippet}
          </pre>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
        {onDiscuss && (
          <button
            className="rounded bg-white/80 px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-white dark:bg-slate-900/70 dark:text-slate-200"
            onClick={() => onDiscuss(asset)}
            aria-label={`Discuss ${asset.name}`}
          >
            Discuss
          </button>
        )}
        {onRemove && (
          <button
            className="rounded bg-white/80 px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-white dark:bg-slate-900/70 dark:text-slate-200"
            onClick={() => onRemove(asset.id)}
            aria-label={`Remove ${asset.name}`}
          >
            Remove
          </button>
        )}
      </div>
      {config.showVersionHistory && (
        <AssetVersionList
          assetId={asset.parentId || asset.id}
          currentSnippet={asset.textSnippet}
          type={asset.type}
          currentSize={asset.size}
          currentMime={asset.mime}
          enableDiff={config.enableDiff}
        />
      )}
    </div>
  )
}
