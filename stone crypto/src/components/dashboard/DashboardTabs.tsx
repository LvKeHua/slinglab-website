"use client"

import { useDashboardStore } from "@/stores"
import { cn } from "@/lib/utils"
import { Briefcase, Wallet } from "lucide-react"
import type { DashboardTab } from "@/types"

const tabs: { value: DashboardTab; label: string; icon: React.ReactNode }[] = [
  { value: "positions", label: "Positions", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { value: "assets", label: "Assets", icon: <Wallet className="h-3.5 w-3.5" /> },
]

export function DashboardTabs() {
  const { dashboardTab, setDashboardTab } = useDashboardStore()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setDashboardTab(tab.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            dashboardTab === tab.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}