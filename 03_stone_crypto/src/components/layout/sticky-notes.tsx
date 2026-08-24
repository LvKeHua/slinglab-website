"use client"

/**
 * StickyNotes — Mazino-style floating memo windows, persisted server-side.
 * Toggle via the "Notes" button in the sidebar footer; drag by the header.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/api-client"
import type { StickyNote } from "@/types"
import { Plus, X } from "lucide-react"

export function StickyNotes() {
  const [visible, setVisible] = useState(false)
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [loaded, setLoaded] = useState(false)
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const load = useCallback(async () => {
    try {
      setNotes(await getNotes())
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    setVisible(localStorage.getItem("sticky-notes-visible") === "1")
    void load()
    const onToggle = () => setVisible((v) => {
      localStorage.setItem("sticky-notes-visible", v ? "0" : "1")
      return !v
    })
    window.addEventListener("sticky-notes-toggle", onToggle)
    return () => window.removeEventListener("sticky-notes-toggle", onToggle)
  }, [load])

  const handleAdd = async () => {
    const { id } = await createNote({ x: 24 + notes.length * 20, y: 24 + notes.length * 20 })
    await load()
  }

  const handleContent = async (id: string, content: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)))
    await updateNote(id, { content })
  }

  const handleDragStart = (e: React.PointerEvent, note: StickyNote) => {
    dragRef.current = { id: note.id, startX: e.clientX, startY: e.clientY, origX: note.x, origY: note.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const x = drag.origX + (e.clientX - drag.startX)
    const y = drag.origY + (e.clientY - drag.startY)
    setNotes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, x, y } : n)))
  }

  const handleDragEnd = async (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    const note = notes.find((n) => n.id === drag.id)
    if (note) await updateNote(drag.id, { x: note.x, y: note.y })
  }

  const handleDelete = async (id: string) => {
    await deleteNote(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  if (!loaded || !visible) return null

  return (
    <>
      {notes.map((note) => (
        <div
          key={note.id}
          className="fixed z-40 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          style={{ left: note.x, top: note.y, width: note.w, height: note.h }}
        >
          <div
            className="flex cursor-grab items-center justify-between bg-secondary px-2 py-1 active:cursor-grabbing"
            onPointerDown={(e) => handleDragStart(e, note)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <span className="text-[10px] text-muted-foreground">memo</span>
            <button
              onClick={() => handleDelete(note.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <textarea
            value={note.content}
            onChange={(e) => handleContent(note.id, e.target.value)}
            placeholder="Type a note..."
            className="flex-1 resize-none border-0 bg-transparent p-2 text-xs outline-none"
          />
        </div>
      ))}
      <div className="fixed bottom-5 right-5 z-40 flex gap-2">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs shadow-lg hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          Note
        </button>
      </div>
    </>
  )
}
