"use client"

import { useEffect, useState } from "react"
import { getConfiguredExchanges } from "@/lib/api-client"

let cached: string[] | null = null
let inflight: Promise<string[]> | null = null

/**
 * Fetch the list of exchange names that have API keys configured.
 * Results are cached in memory so all 6 pages share one API call.
 */
export function useConfiguredExchanges(): {
  configuredExchanges: string[]
  isLoading: boolean
  error: string | null
} {
  const [configuredExchanges, setConfiguredExchanges] = useState<string[]>(cached ?? [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) {
      setConfiguredExchanges(cached)
      setIsLoading(false)
      return
    }

    if (inflight) {
      inflight
        .then((result) => {
          cached = result
          setConfiguredExchanges(result)
          setIsLoading(false)
        })
        .catch(() => {
          // error already handled by the original caller
        })
      return
    }

    inflight = getConfiguredExchanges()

    inflight
      .then((result) => {
        cached = result
        setConfiguredExchanges(result)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        cached = []
        setError(err instanceof Error ? err.message : "Failed to load configured exchanges")
        setIsLoading(false)
      })
  }, [])

  return { configuredExchanges, isLoading, error }
}
