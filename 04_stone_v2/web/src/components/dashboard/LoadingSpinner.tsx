"use client"

import { RefreshCw } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string
  submessage?: string
}

export function LoadingSpinner({ message = "Loading dashboard", submessage }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-3">
      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      {submessage && (
        <p className="text-xs text-muted-foreground">{submessage}</p>
      )}
    </div>
  )
}