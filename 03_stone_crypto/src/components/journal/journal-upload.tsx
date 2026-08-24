"use client"

/**
 * JournalUpload — Mazino-style chart screenshot uploader. Reads the image
 * client-side, posts the data URL to /api/uploads, and creates a journal
 * entry carrying the served URL.
 */
import { useRef, useState } from "react"
import { uploadChart } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ImagePlus, Loader2, X } from "lucide-react"

interface PendingShot {
  dataUrl: string
  caption: string
}

export function JournalUpload({ onCreated }: { onCreated: () => void }) {
  const [trade, setTrade] = useState("")
  const [content, setContent] = useState("")
  const [shots, setShots] = useState<PendingShot[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const next: PendingShot[] = []
    for (const file of Array.from(files).slice(0, 4)) {
      if (!file.type.startsWith("image/")) continue
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("read failed"))
        reader.readAsDataURL(file)
      })
      next.push({ dataUrl, caption: file.name.replace(/\.[a-z]+$/i, "") })
    }
    setShots((prev) => [...prev, ...next].slice(0, 4))
  }

  const handleSave = async () => {
    if (!trade.trim() && shots.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const chartUrls: string[] = []
      for (const shot of shots) {
        const { url } = await uploadChart(shot.dataUrl)
        chartUrls.push(url)
      }
      await fetch("/api/v1/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: trade.trim() || "Chart note",
          content,
          chartUrls,
          tags: [],
          confidence: 0,
          emotions: [],
        }),
      })
      setTrade("")
      setContent("")
      setShots([])
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
        <CardTitle>Add Entry with Screenshots</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            placeholder="Trade (e.g. BTCUSDT Long)"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            Add Screenshots
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { void handleFiles(e.target.files); e.target.value = "" }}
        />
        <textarea
          placeholder="Notes..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />

        {shots.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {shots.map((shot, i) => (
              <div key={i} className="overflow-hidden rounded-md border border-border bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.dataUrl} alt={shot.caption} className="h-24 w-full object-cover" />
                <div className="flex items-center justify-between gap-1 p-1.5">
                  <span className="truncate text-[11px] text-muted-foreground">{shot.caption}</span>
                  <button
                    onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button onClick={handleSave} disabled={saving || (shots.length === 0 && !trade.trim())}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Entry"}
        </Button>
      </CardContent>
    </Card>
  )
}
