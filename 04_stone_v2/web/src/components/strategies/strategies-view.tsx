"use client"

/**
 * Strategies — Mazino-style playbook: named strategies with rule lists and
 * live stats derived from closed trades matching the strategy tag.
 */
import { useCallback, useEffect, useState } from "react"
import { getStrategies, createStrategy, deleteStrategy } from "@/lib/api-client"
import type { Strategy } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, X } from "lucide-react"

export function StrategiesView() {
  const [items, setItems] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [rules, setRules] = useState<string[]>([])
  const [ruleDraft, setRuleDraft] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await getStrategies())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const addRule = () => {
    const trimmed = ruleDraft.trim()
    if (!trimmed) return
    setRules((prev) => [...prev, trimmed])
    setRuleDraft("")
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createStrategy({ name: name.trim(), description, rules })
      setName("")
      setDescription("")
      setRules([])
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteStrategy(id)
    await load()
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading strategies...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your trading playbook — write down the rules before the trade
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              placeholder="Strategy name (e.g. Range Breakout)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-4 space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <span className="flex-1">{rule}</span>
                <button
                  onClick={() => setRules((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Add a rule (e.g. Only enter after daily close retest)"
              value={ruleDraft}
              onChange={(e) => setRuleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addRule() }
              }}
            />
            <Button variant="outline" onClick={addRule}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Strategy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No strategies yet. Codify your first setup above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{s.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                {s.rules.length > 0 && (
                  <ol className="space-y-1.5">
                    {s.rules.map((rule, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                        {rule}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
