"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
  Briefcase,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  Wallet,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/performance", label: "Performance", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reporting", label: "Reporting", icon: FileText },
  { href: "/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/journal", label: "Journal", icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
          S
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight">Stone</span>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {!collapsed && (
        <div className="px-3 py-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      )}

      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-muted-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
