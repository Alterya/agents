"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Wand2, Sparkles, Save, Share } from "lucide-react"

export function PromptBroHeader() {
  return (
    <header className="flex items-center justify-between p-6 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)]">
              PromptBRO Generator
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered prompt creation and optimization for mission-driven tasks
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* AI Status */}
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 gap-1">
            <Sparkles className="h-3 w-3" />
            AI Ready
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search prompts..." className="pl-10 w-64" />
        </div>

        {/* Quick Actions */}
        <Button variant="outline" className="gap-2 bg-transparent">
          <Save className="h-4 w-4" />
          Save Draft
        </Button>

        <Button className="gap-2">
          <Share className="h-4 w-4" />
          Share Prompt
        </Button>
      </div>
    </header>
  )
}
