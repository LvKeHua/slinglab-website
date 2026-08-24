"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatPnL } from "@/lib/utils"
import type { FundingFeesData } from "@/utils/analytics"

interface FundingFeesSectionProps {
  data: FundingFeesData
}

function valueColor(value: number) {
  return value >= 0 ? "text-emerald-400" : "text-red-400"
}

export function FundingFeesSection({ data }: FundingFeesSectionProps) {
  const maxFundingValue = Math.max(
    Math.abs(data.fundingReceived),
    Math.abs(data.fundingPaid),
    Math.abs(data.netFunding),
    1,
  )
  const maxFeesValue = Math.max(
    Math.abs(data.makerRebates),
    Math.abs(data.marketFeesPaid),
    Math.abs(data.netFees),
    1,
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Funding</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-1.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="pb-1.5 text-right text-xs font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-1.5 text-xs text-muted-foreground">Funding Received</td>
                <td className={cn("py-1.5 text-right text-xs font-semibold tabular-nums", valueColor(data.fundingReceived))}>
                  {formatPnL(data.fundingReceived)}
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 text-xs text-muted-foreground">Funding Paid</td>
                <td className="py-1.5 text-right text-xs font-semibold tabular-nums text-red-400">
                  {formatPnL(-data.fundingPaid)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-xs text-muted-foreground">Net Funding</td>
                <td className={cn("py-1.5 text-right text-xs font-semibold tabular-nums", valueColor(data.netFunding))}>
                  <div>{formatPnL(data.netFunding)}</div>
                  <div className="mt-1 h-1 rounded-full" style={{ width: `${Math.min(100, (Math.abs(data.netFunding) / maxFundingValue) * 100)}%`, backgroundColor: data.netFunding >= 0 ? '#34d399' : '#f87171' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fees</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-1.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="pb-1.5 text-right text-xs font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-1.5 text-xs text-muted-foreground">Maker Rebates Received</td>
                <td className={cn("py-1.5 text-right text-xs font-semibold tabular-nums", valueColor(data.makerRebates))}>
                  {formatPnL(data.makerRebates)}
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-1.5 text-xs text-muted-foreground">Market Fees Paid</td>
                <td className="py-1.5 text-right text-xs font-semibold tabular-nums text-red-400">
                  {formatPnL(-data.marketFeesPaid)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-xs text-muted-foreground">Net Fees</td>
                <td className={cn("py-1.5 text-right text-xs font-semibold tabular-nums", valueColor(data.netFees))}>
                  <div>{formatPnL(data.netFees)}</div>
                  <div className="mt-1 h-1 rounded-full" style={{ width: `${Math.min(100, (Math.abs(data.netFees) / maxFeesValue) * 100)}%`, backgroundColor: data.netFees >= 0 ? '#34d399' : '#f87171' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}