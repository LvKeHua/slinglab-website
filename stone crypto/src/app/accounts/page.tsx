"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Plus, Trash2, RefreshCw, Loader2, Wallet, Key, FolderPlus, X,
} from "lucide-react"
import {
  getAccounts, createAccount, updateAccount, deleteAccount,
  getGroups, createGroup, deleteGroup, syncAll, syncOne, getBalanceHistory,
  type AccountOut, type GroupOut,
} from "@/lib/api-client"

const EXCHANGE_OPTIONS = [
  { value: "binance", label: "Binance" },
  { value: "bybit", label: "Bybit" },
  { value: "gate", label: "Gate" },
  { value: "okx", label: "OKX" },
  { value: "bitget", label: "Bitget" },
  { value: "hyperliquid", label: "Hyperliquid" },
  { value: "derive", label: "Derive" },
  { value: "extended", label: "Extended" },
  { value: "crossex", label: "CrossEx (7 venues)" },
]

const EXCHANGE_COLORS: Record<string, string> = {
  binance: "text-amber-400",
  bybit: "text-blue-400",
  gate: "text-yellow-400",
  okx: "text-sky-400",
  bitget: "text-purple-400",
  hyperliquid: "text-emerald-400",
  derive: "text-pink-400",
  extended: "text-slate-400",
  crossex: "text-orange-400",
}

const RANGE_OPTIONS = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "All" },
]

interface NewAccountForm {
  exchange: string
  name: string
  groupId: string
  apiKey: string
  secretKey: string
  passphrase: string
  walletAddress: string
}

const emptyForm: NewAccountForm = {
  exchange: "binance",
  name: "",
  groupId: "none",
  apiKey: "",
  secretKey: "",
  passphrase: "",
  walletAddress: "",
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountOut[]>([])
  const [groups, setGroups] = useState<GroupOut[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<Array<{ accountName: string; status: string; balance: number; trades: number; message?: string }> | null>(null)
  const [form, setForm] = useState<NewAccountForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [history, setHistory] = useState<{ total: Array<{ t: string; v: number }>; perAccount: Record<string, Array<{ t: string; v: number }>> } | null>(null)
  const [range, setRange] = useState("30D")

  const load = useCallback(async () => {
    const [accs, grps] = await Promise.all([getAccounts(), getGroups()])
    setAccounts(accs)
    setGroups(grps)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  const loadHistory = useCallback(async (r: string) => {
    try {
      setHistory(await getBalanceHistory(r))
    } catch {
      setHistory(null)
    }
  }, [])

  useEffect(() => {
    loadHistory(range)
  }, [range, loadHistory])

  async function handleCreate() {
    if (!form.name) return
    try {
      await createAccount({
        exchange: form.exchange,
        name: form.name,
        groupId: form.groupId === "none" ? null : Number(form.groupId),
        apiKey: form.apiKey || undefined,
        secretKey: form.secretKey || undefined,
        passphrase: form.passphrase || undefined,
        walletAddress: form.walletAddress || undefined,
      })
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Create failed")
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this account? Its balance history will be removed.")) return
    await deleteAccount(id)
    await load()
  }

  async function handleToggle(id: number, enabled: boolean) {
    await updateAccount(id, { enabled })
    await load()
  }

  async function handleSyncAll() {
    setSyncing(true)
    setSyncResults(null)
    try {
      const result = await syncAll()
      setSyncResults(result.results)
      await load()
      await loadHistory(range)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncOne(id: number) {
    try {
      const result = await syncOne(id)
      setSyncResults([result])
      await load()
      await loadHistory(range)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed")
    }
  }

  async function handleAddGroup() {
    if (!newGroupName.trim()) return
    await createGroup(newGroupName.trim())
    setNewGroupName("")
    await load()
  }

  async function handleDeleteGroup(id: number) {
    if (!confirm("Delete this group? Accounts become unassigned.")) return
    await deleteGroup(id)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified balance tracking across all exchanges — {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSyncAll} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sync All
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </Button>
        </div>
      </div>

      <Separator />

      {/* Add account form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">New Account</CardTitle>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Exchange</label>
                <Select value={form.exchange} onValueChange={(v) => setForm({ ...form, exchange: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXCHANGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Name</label>
                <Input
                  placeholder="e.g. Main Futures"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Group</label>
                <Select value={form.groupId} onValueChange={(v) => setForm({ ...form, groupId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet Address (Hyperliquid)</label>
                <Input
                  placeholder="0x…"
                  value={form.walletAddress}
                  onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  placeholder="Read-only API key"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Key</label>
                <Input
                  type="password"
                  placeholder="Secret"
                  value={form.secretKey}
                  onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Passphrase (OKX/Bitget)</label>
                <Input
                  type="password"
                  placeholder="Optional"
                  value={form.passphrase}
                  onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!form.name}>
                <Plus className="h-4 w-4 mr-1" />
                Create Account
              </Button>
              <p className="text-xs text-muted-foreground">
                Keys are encrypted at rest and never returned to the client.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Groups</CardTitle>
          <CardDescription>Organize accounts into portfolios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="max-w-xs"
            />
            <Button size="sm" variant="outline" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
              <FolderPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="gap-1 pr-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                {g.name}
                <button
                  onClick={() => handleDeleteGroup(g.id)}
                  className="text-muted-foreground hover:text-red-400 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {groups.length === 0 && (
              <p className="text-xs text-muted-foreground">No groups yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync results */}
      {syncResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sync Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {syncResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant={r.status === "ok" ? "success" : "destructive"} className="text-[10px]">
                    {r.status}
                  </Badge>
                  {r.accountName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {r.status === "ok" ? `${fmtUsd(r.balance)} · ${r.trades} trades` : r.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Balance history chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Balance History</CardTitle>
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map((o) => (
              <Button
                key={o.value}
                size="sm"
                variant={range === o.value ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setRange(o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {history && history.total.length > 0 ? (
            <BalanceChart history={history} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No balance history yet — run a sync to start tracking. Snapshots are taken on every sync.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Account list */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className={`h-5 w-5 ${EXCHANGE_COLORS[account.exchange] ?? "text-muted-foreground"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{account.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {EXCHANGE_OPTIONS.find((o) => o.value === account.exchange)?.label ?? account.exchange}
                      </Badge>
                      {account.group && (
                        <Badge variant="secondary" className="text-[10px]">{account.group}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {account.hasApiKey ? <Key className="h-3 w-3 inline mr-1" /> : null}
                      {account.hasApiKey ? "API key stored" : "No API key"}
                      {account.walletAddress ? ` · ${account.walletAddress.slice(0, 10)}…` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(account.id, !account.enabled)}
                  >
                    {account.enabled ? "Enabled" : "Disabled"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSyncOne(account.id)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Sync
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No accounts configured. Add your first exchange account to start tracking.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function BalanceChart({ history }: { history: { total: Array<{ t: string; v: number }>; perAccount: Record<string, Array<{ t: string; v: number }>> } }) {
  const points = history.total
  const max = Math.max(...points.map((p) => p.v), 1)
  const min = Math.min(...points.map((p) => p.v), 0)
  const span = max - min || 1

  const path = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * 100
      const y = 100 - ((p.v - min) / span) * 100
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  return (
    <div>
      <div className="relative h-48 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="0.6" className="text-primary" />
        </svg>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span>{points[0]?.t.slice(0, 10)}</span>
        <span className="font-semibold text-foreground">{fmtUsd(points[points.length - 1]?.v ?? 0)}</span>
        <span>{points[points.length - 1]?.t.slice(0, 10)}</span>
      </div>
    </div>
  )
}
