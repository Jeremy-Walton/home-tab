import { useRef } from 'react'
import { useAppState } from '../context/useAppState'
import { cn } from '../lib/utils'
import { OptionsMenu } from './OptionsMenu'
import { DropdownMenuItem } from './ui/dropdown-menu'

export function ImportExportBar({ className }: { className?: string }) {
  const { exportState, importState } = useAppState()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const data = exportState()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'launch-tabs-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    const data = JSON.parse(text)
    await importState(data)
  }

  return (
    <div className={cn(className)}>
      <OptionsMenu label="Import / export" variant="ghost" size="icon-sm" align="end">
        <DropdownMenuItem onClick={handleExport}>Export</DropdownMenuItem>
        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
          Import
        </DropdownMenuItem>
      </OptionsMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
