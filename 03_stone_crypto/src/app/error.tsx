"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="text-center space-y-3 max-w-xl">
        <h2 className="text-xl font-bold text-red-400">Something went wrong!</h2>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-left">
          <p className="text-sm font-mono text-red-300 break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
