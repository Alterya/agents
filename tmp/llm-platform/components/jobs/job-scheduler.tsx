"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Calendar, Clock, Plus, Settings } from "lucide-react"

const jobTypes = [
  { id: "model-battle", name: "Model Battle", description: "LLM comparison battles" },
  { id: "conversation-sim", name: "Conversation Simulation", description: "Bulk conversation testing" },
  { id: "prompt-optimization", name: "Prompt Optimization", description: "AI-powered prompt improvement" },
  { id: "evaluation", name: "Performance Evaluation", description: "Model performance analysis" },
  { id: "data-processing", name: "Data Processing", description: "Batch data operations" },
]

const priorities = [
  { id: "low", name: "Low", color: "bg-muted text-muted-foreground" },
  { id: "normal", name: "Normal", color: "bg-primary/10 text-primary hover:bg-primary/20" },
  { id: "high", name: "High", color: "bg-accent/10 text-accent hover:bg-accent/20" },
  { id: "urgent", name: "Urgent", color: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
]

export function JobScheduler() {
  const [jobType, setJobType] = useState("")
  const [priority, setPriority] = useState("normal")
  const [recurring, setRecurring] = useState(false)

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Calendar className="h-5 w-5 text-primary" />
          Job Scheduler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Job Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Job Type</Label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span>{type.name}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      <Badge className={`text-xs ${p.color}`}>{p.name}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Schedule Time</Label>
            <div className="flex items-center gap-2">
              <Input type="datetime-local" className="flex-1" />
              <Button variant="outline" size="sm" className="bg-transparent">
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Job Name</Label>
            <Input placeholder="e.g., Daily Model Battle" />
          </div>
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Max Retries</Label>
            <Input type="number" defaultValue="3" min="0" max="10" />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Timeout (minutes)</Label>
            <Input type="number" defaultValue="30" min="1" max="1440" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Recurring Job</Label>
              <p className="text-xs text-muted-foreground">Run on schedule</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
        </div>

        {/* Recurring Options */}
        {recurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-lg">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">End Date (Optional)</Label>
              <Input type="date" />
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            Advanced configuration available after scheduling
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline">Save Template</Button>
            <Button className="gap-2" disabled={!jobType}>
              <Plus className="h-4 w-4" />
              Schedule Job
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
