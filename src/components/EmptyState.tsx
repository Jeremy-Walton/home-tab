export function EmptyState({ onAddLink }: { onAddLink: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-gray-500">
      <h1 className="text-xl font-semibold text-gray-700">Welcome to Launch Tabs!</h1>
      <p className="text-sm">Add your first link to get started.</p>
      <button
        onClick={onAddLink}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Add link
      </button>
    </div>
  )
}
