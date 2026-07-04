import { useRef, useState } from 'react'
import { useAppState } from '../context/useAppState'
import { cn } from '../lib/utils'
import { OptionsMenu } from './OptionsMenu'
import { DropdownMenuItem } from './ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from './ui/alert-dialog'

export function ImportExportBar({ className }: { className?: string }) {
  const { exportState, importState } = useAppState()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null)

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
    try {
      const text = await file.text()
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('That file is not valid JSON.')
      }
      const summary = await importState(data)
      setFeedback({
        title: 'Import complete',
        message: `Imported ${summary.dashboards} dashboard(s) and ${summary.links} link(s).`,
      })
    } catch (error) {
      setFeedback({
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Could not import that file.',
      })
    }
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
      {feedback && (
        <AlertDialog open onOpenChange={(open) => !open && setFeedback(null)}>
          <AlertDialogContent size="sm">
            <AlertDialogTitle>{feedback.title}</AlertDialogTitle>
            <AlertDialogDescription>{feedback.message}</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setFeedback(null)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
