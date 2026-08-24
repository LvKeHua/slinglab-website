"use client"

/**
 * ManualTradeForm — CMM Add Transaction: record a closed trade by hand.
 * PnL and R-multiple are computed server-side from entry/exit/size/fees.
 */
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"

export function ManualTradeForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    symbol: "",
    dir: "Long",
    size: "",
    entry: "",
    exit: "",
    fees: "",
    entryTime: "",
    exitTime: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!form.symbol.trim() || !form.entry || !form.exit) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/trades/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: form.symbol.trim().toUpperCase(),
          dir: form.dir,
          size: Number(form.size) || 0,
          entry: Number(form.entry),
          exit: Number(form.exit),
          fees: Number(form.fees) || 0,
          entryTime: form.entryTime || undefined,
          exitTime: form.exitTime || undefined,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setForm({ symbol: "", dir: "Long", size: "", entry: "", exit: "", fees: "", entryTime: "", exitTime: "" })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Manual Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Input
            placeholder="Symbol (e.g. BTCUSDT)"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          />
          <select
            value={form.dir}
            onChange={(e) => setForm({ ...form, dir: e.target.value })}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>
          <Input
            type="number"
            placeholder="Size (qty)"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Fees (USDT)"
            value={form.fees}
            onChange={(e) => setForm({ ...form, fees: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Entry price"
            value={form.entry}
            onChange={(e) => setForm({ ...form, entry: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Exit price"
            value={form.exit}
            onChange={(e) => setForm({ ...form, exit: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={form.entryTime}
            onChange={(e) => setForm({ ...form, entryTime: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={form.exitTime}
            onChange={(e) => setForm({ ...form, exitTime: e.target.value })}
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-4">
          <Button onClick={handleSave} disabled={saving || !form.symbol.trim() || !form.entry || !form.exit}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Saving..." : "Add Trade"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
