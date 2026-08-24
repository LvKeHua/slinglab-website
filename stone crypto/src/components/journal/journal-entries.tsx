"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { JournalEntry as JournalEntryType } from "@/types"
import { BookOpen, MessageSquare, Star } from "lucide-react"

interface JournalEntriesProps {
  entries: JournalEntryType[]
}

const emotionColors: Record<string, string> = {
  confident: 'text-emerald-400 bg-emerald-500/10',
  focused: 'text-blue-400 bg-blue-500/10',
  frustrated: 'text-red-400 bg-red-500/10',
  patient: 'text-amber-400 bg-amber-500/10',
  anxious: 'text-orange-400 bg-orange-500/10',
}

export function JournalEntries({ entries }: JournalEntriesProps) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Entries</p>
              <p className="text-xl font-bold">{entries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
              <p className="text-xl font-bold">
                {entries.length > 0
                  ? (entries.reduce((s, e) => s + e.confidence, 0) / entries.length).toFixed(1)
                  : "0.0"}
                <span className="text-sm text-muted-foreground font-normal">/5</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Tags Used</p>
              <p className="text-xl font-bold">
                {new Set(entries.flatMap((e) => e.tags)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journal Entries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Notes & Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-b border-border/50 p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{entry.trade}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < entry.confidence ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
                        )}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {entry.content}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">
                      {tag}
                    </Badge>
                  ))}
                  {entry.emotions.map((emotion) => (
                    <span
                      key={emotion}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        emotionColors[emotion] || 'text-muted-foreground bg-muted/50'
                      )}
                    >
                      {emotion}
                    </span>
                  ))}
                  {entry.chartUrls.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      📊 {entry.chartUrls.length} chart{entry.chartUrls.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
