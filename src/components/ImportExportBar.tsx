import { useRef } from 'react'
import { useAppState } from '../context/useAppState'
import { Button } from './ui/button'

export function ImportExportBar() {
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
    <div className="flex gap-2 border-t border-border p-2">
      <Button variant="ghost" size="sm" onClick={handleExport}>
        Export
      </Button>
      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
        Import
      </Button>
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
