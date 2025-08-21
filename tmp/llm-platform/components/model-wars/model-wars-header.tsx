"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Swords, Play, History } from "lucide-react"

export function ModelWarsHeader() {
  return (
    <header className="flex items-center justify-between p-6 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Swords className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)]">
              Model Wars Arena
            </h1>
            <p className="text-sm text-muted-foreground">Battle LLMs head-to-head on scammer detection tasks</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search battles, models..." className="pl-10 w-64" />
        </div>

        {/* Quick Actions */}
        <Button className="gap-2">
          <Play className="h-4 w-4" />
          Quick Battle
        </Button>

        <Button variant="outline" className="gap-2 bg-transparent">
          <History className="h-4 w-4" />
          Battle History
        </Button>
      </div>
    </header>
  )
}
