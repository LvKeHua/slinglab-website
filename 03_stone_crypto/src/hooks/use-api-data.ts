"use client"

import { useCallback, useEffect, useState } from "react"
import { getDashboardData } from "@/lib/api-client"
import type { MockData } from "@/types"

export function useApiData() {
  const [data, setData] = useState<MockData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await getDashboardData())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, isLoading, error, refetch: load }
}
