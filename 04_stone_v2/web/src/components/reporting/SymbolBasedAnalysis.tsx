"use client"

import { TradedSymbolsReport } from "@/components/analytics/TradedSymbolsReport"
import type { SymbolReportRow } from "@/utils/reporting"

interface SymbolBasedAnalysisProps {
  data: SymbolReportRow[]
}

export function SymbolBasedAnalysis({ data }: SymbolBasedAnalysisProps) {
  return <TradedSymbolsReport data={data} />
}