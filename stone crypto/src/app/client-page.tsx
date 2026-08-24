"use client"

import dynamic from "next/dynamic"

const DashboardClient = dynamic(
  () => import("@/components/dashboard/dashboard-client"),
  { ssr: false }
)

export default function ClientPage() {
  return <DashboardClient />
}
