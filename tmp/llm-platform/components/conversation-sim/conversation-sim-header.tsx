"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare, Play, BarChart3 } from "lucide-react"

export function ConversationSimHeader() {
  return (
    <header className="flex items-center justify-between p-6 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-space-grotesk)]">
              Conversation Simulation
            </h1>
            <p className="text-sm text-muted-foreground">
              Run large-scale conversation tests and analyze prompt performance
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* System Status */}
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Queue: 247 jobs</Badge>
          <Badge className="bg-accent/10 text-accent hover:bg-accent/20">Running: 12</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search simulations..." className="pl-10 w-64" />
        </div>

        {/* Quick Actions */}
        <Button className="gap-2">
          <Play className="h-4 w-4" />
          Quick Sim
        </Button>

        <Button variant="outline" className="gap-2 bg-transparent">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      </div>
    </header>
  )
}
