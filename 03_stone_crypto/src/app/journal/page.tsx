"use client"

import { useCallback, useState } from "react"
import { useApiData } from "@/hooks/use-api-data"
import { JournalEntries } from "@/components/journal/journal-entries"
import { JournalUpload } from "@/components/journal/journal-upload"

export default function JournalPage() {
  const { data, isLoading, error, refetch } = useApiData()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1)
    void refetch()
  }, [refetch])

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading journal...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>
  if (!data) return null

  const { journal } = data

  return (
    <div className="space-y-6" key={refreshKey}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trading notes & tagged analysis
        </p>
      </div>
      <JournalUpload onCreated={handleCreated} />
      <JournalEntries entries={journal} />
    </div>
  )
}
