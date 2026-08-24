"use client"

/**
 * Scorecards — Mazino-style trade grading: checklist + 1–10 grade per trade.
 */
import { useCallback, useEffect, useState } from "react"
import { getScorecards, createScorecard, deleteScorecard } from "@/lib/api-client"
import type { Scorecard } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const CHECKLIST = [
  "Clear setup (HTF structure aligned)",
  "Entry trigger confirmed",
  "Risk defined before entry",
  "Position size respected",
  "Exit plan written",
  "No FOMO entry",
  "Followed the plan",
  "Managed the trade actively",
] as const

function gradeClass(grade: number | null): string {
  if (grade === null) return ""
  if (grade >= 8) return "text-green-500 bg-green-500/10"
  if (grade >= 5) return "text-amber-500 bg-amber-500/10"
  return "text-red-500 bg-red-500/10"
}

export function ScorecardsView() {
  const [cards, setCards] = useState<Scorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    symbol: "",
    direction: "Long",
    entry: "",
    exit: "",
    grade: "",
    notes: "",
  })
  const [checks, setChecks] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setCards(await getScorecards())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const toggleCheck = (label: string) => {
    setChecks((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    )
  }

  const handleSave = async () => {
    if (!form.symbol.trim()) return
    setSaving(true)
    try {
      const entry = form.entry ? Number(form.entry) : null
      const exit = form.exit ? Number(form.exit) : null
      const rMultiple =
        entry && exit && form.direction === "Long" ? (exit - entry) / entry : 0
      await createScorecard({
        symbol: form.symbol.trim().toUpperCase(),
        direction: form.direction,
        entry,
        exit,
        rMultiple,
        grade: form.grade ? Number(form.grade) : null,
        checks,
        notes: form.notes,
      })
      setForm({ symbol: "", direction: "Long", entry: "", exit: "", grade: "", notes: "" })
      setChecks([])
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteScorecard(id)
    await load()
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading scorecards...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scorecards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grade every trade against your checklist
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle>New Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Input
              placeholder="Symbol (e.g. BTCUSDT)"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            />
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
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
              type="number"
              min={1}
              max={10}
              placeholder="Grade (1-10)"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {CHECKLIST.map((label) => (
              <label key={label} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checks.includes(label)}
                  onChange={() => toggleCheck(label)}
                  className="accent-green-500"
                />
                {label}
              </label>
            ))}
          </div>

          <textarea
            placeholder="Notes — what went well, what to improve..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-4 h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />

          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving || !form.symbol.trim()}>
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : "Save Scorecard"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card grid */}
      {cards.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No scorecards yet. Grade your first trade above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{c.symbol}</span>
                  <span className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-xs",
                    c.direction === "Long" ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10",
                  )}>
                    {c.direction}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {c.grade !== null && (
                    <span className={cn("rounded-md px-2 py-1 font-mono text-sm font-bold", gradeClass(c.grade))}>
                      {c.grade}/10
                    </span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between font-mono text-xs text-muted-foreground">
                  <span>Entry {c.entry ?? "—"}</span>
                  <span>Exit {c.exit ?? "—"}</span>
                  <span>R {c.rMultiple.toFixed(2)}</span>
                </div>
                {c.checks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.checks.map((ch) => (
                      <span key={ch} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
                {c.notes && <p className="text-muted-foreground">{c.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(c.createdAt + "Z").toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
