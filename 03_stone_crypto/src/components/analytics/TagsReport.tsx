"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TagsReport() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tags Report</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Tag Manager</p>
          <p className="text-xs text-muted-foreground">No Data Available</p>
        </div>
      </CardContent>
    </Card>
  )
}
