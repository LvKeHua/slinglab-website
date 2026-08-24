"use client"

import { useApiData } from "@/hooks/use-api-data"
import { JournalEntries } from "@/components/journal/journal-entries"

export default function JournalPage() {
  const { data, isLoading, error } = useApiData()

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading journal...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>
  if (!data) return null

  const { journal } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trading notes & tagged analysis
        </p>
      </div>
      <JournalEntries entries={journal} />
    </div>
  )
}
