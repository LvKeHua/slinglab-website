"use client"

import { Download, FileText, Copy } from "lucide-react"
import { useState } from "react"

interface ExportActionsProps {
  csvData: string
  jsonData: string
}

export function ExportActions({ csvData, jsonData }: ExportActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleExportReport = () => {
    window.print()
  }

  const handleDownloadCSV = () => {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "report-" + new Date().toISOString().slice(0, 10) + ".csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyJSON = async () => {
    await navigator.clipboard.writeText(jsonData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleExportReport}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors"
      >
        <FileText className="h-4 w-4" /> Export Report
      </button>
      <button
        onClick={handleDownloadCSV}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors"
      >
        <Download className="h-4 w-4" /> Download CSV
      </button>
      <button
        onClick={handleCopyJSON}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors"
      >
        <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy JSON"}
      </button>
    </div>
  )
}