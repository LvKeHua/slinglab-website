"use client"

/**
 * Wallets — on-chain wallet tracking (OSS tracker integration).
 * EVM via DeBank Cloud API, Solana/Sui/Cosmos via CoinStats.
 * Provider keys are configured in Settings → Data Providers.
 */
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, RefreshCw, Wallet as WalletIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface WalletRow {
  id: string
  chain: string
  name: string
  address: string
  enabled: boolean
  createdAt: string
}

interface Holding {
  symbol: string
  name: string
  chain: string
  amount: number
  price: number
  usdValue: number
  kind: "token" | "defi"
  protocol?: string
}

const CHAIN_OPTIONS = [
  { value: "evm", label: "EVM (DeBank)" },
  { value: "solana", label: "Solana (CoinStats)" },
  { value: "sui", label: "Sui (CoinStats)" },
  { value: "cosmos", label: "Cosmos (CoinStats)" },
]

function fmtUsd(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ chain: "evm", name: "", address: "" })
  const [syncing, setSyncing] = useState<string | null>(null)
  const [holdings, setHoldings] = useState<Record<string, { totalUsd: number; holdings: Holding[] }>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setWallets(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleAdd = async () => {
    if (!form.address.trim()) return
    await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: form.chain, name: form.name, address: form.address.trim() }),
    })
    setForm({ chain: "evm", name: "", address: "" })
    await load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/wallets/${id}`, { method: "DELETE" })
    await load()
  }

  const handleSync = async (wallet: WalletRow) => {
    setSyncing(wallet.id)
    setError(null)
    try {
      const res = await fetch(`/api/wallets/${wallet.id}/sync`, { method: "POST" })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setHoldings((prev) => ({ ...prev, [wallet.id]: body }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading wallets...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          On-chain wallet tracking — EVM via DeBank, Solana/Sui/Cosmos via CoinStats
        </p>
      </div>

      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <select
              value={form.chain}
              onChange={(e) => setForm({ ...form, chain: e.target.value })}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {CHAIN_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <Input
              placeholder="Name (optional)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="Wallet address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleAdd} disabled={!form.address.trim()}>
              <Plus className="h-4 w-4" />
              Add Wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Wallet cards */}
      {wallets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No wallets yet. Add an address above — provider keys go in Settings → Data Providers.
        </p>
      ) : (
        <div className="space-y-4">
          {wallets.map((wallet) => {
            const data = holdings[wallet.id]
            return (
              <Card key={wallet.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <WalletIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{wallet.name}</CardTitle>
                      <p className="font-mono text-xs text-muted-foreground">
                        {wallet.chain} · {wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {data && (
                      <span className="font-mono text-lg font-bold">{fmtUsd(data.totalUsd)}</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(wallet)}
                      disabled={syncing === wallet.id}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", syncing === wallet.id && "animate-spin")} />
                      Sync
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(wallet.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardHeader>
                {data && data.holdings.length > 0 && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                            <th className="pb-2 pr-4">Asset</th>
                            <th className="pb-2 pr-4">Type</th>
                            <th className="pb-2 pr-4 text-right">Amount</th>
                            <th className="pb-2 pr-4 text-right">Price</th>
                            <th className="pb-2 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.holdings.map((h, i) => (
                            <tr key={`${h.symbol}-${i}`} className="border-b border-border/50">
                              <td className="py-2 pr-4">
                                <span className="font-medium">{h.symbol}</span>
                                {h.protocol && (
                                  <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                                    {h.protocol}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-xs text-muted-foreground">
                                {h.kind === "defi" ? "DeFi" : h.chain}
                              </td>
                              <td className="py-2 pr-4 text-right font-mono">
                                {h.amount > 0 ? h.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                              </td>
                              <td className="py-2 pr-4 text-right font-mono">
                                {h.price > 0 ? fmtUsd(h.price) : "—"}
                              </td>
                              <td className="py-2 text-right font-mono">{fmtUsd(h.usdValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
