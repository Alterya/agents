"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { MessageSquare, Settings, Zap, Users } from "lucide-react"

const models = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
  { id: "gpt-3.5", name: "GPT-3.5 Turbo", provider: "OpenAI" },
  { id: "claude-3", name: "Claude-3 Opus", provider: "Anthropic" },
  { id: "claude-3-sonnet", name: "Claude-3 Sonnet", provider: "Anthropic" },
]

export function SimulationSetup() {
  const [sideAModel, setSideAModel] = useState("")
  const [sideBModel, setSideBModel] = useState("")
  const [sideAPrompt, setSideAPrompt] = useState("")
  const [sideBPrompt, setSideBPrompt] = useState("")
  const [batchSize, setBatchSize] = useState([1000])
  const [parallelJobs, setParallelJobs] = useState([10])
  const [enableLogging, setEnableLogging] = useState(true)

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <MessageSquare className="h-5 w-5 text-primary" />
          Setup New Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Configuration */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Simulation Name</Label>
          <Input placeholder="e.g., Scammer Detection Comparison v1.0" />
        </div>

        <Separator />

        {/* Conversation Participants */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground font-[family-name:var(--font-space-grotesk)]">
              Conversation Participants
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Side A Configuration */}
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-card-foreground">Side A (User/Victim)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Model</Label>
                  <Select value={sideAModel} onValueChange={setSideAModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model for Side A" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {model.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Prompt</Label>
                  <Textarea
                    placeholder="Enter the prompt for Side A (e.g., user/victim behavior, detection instructions)..."
                    value={sideAPrompt}
                    onChange={(e) => setSideAPrompt(e.target.value)}
                    className="min-h-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Side B Configuration */}
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-card-foreground">Side B (Scammer/Opponent)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Model</Label>
                  <Select value={sideBModel} onValueChange={setSideBModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model for Side B" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {model.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Prompt</Label>
                  <Textarea
                    placeholder="Enter the prompt for Side B (e.g., scammer tactics, manipulation strategies)..."
                    value={sideBPrompt}
                    onChange={(e) => setSideBPrompt(e.target.value)}
                    className="min-h-32"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Simulation Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Batch Size: {batchSize[0]} conversations</Label>
              <Slider
                value={batchSize}
                onValueChange={setBatchSize}
                max={10000}
                min={100}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>10,000</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Parallel Jobs: {parallelJobs[0]}</Label>
              <Slider
                value={parallelJobs}
                onValueChange={setParallelJobs}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>50</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">System Prompt</Label>
              <Textarea
                placeholder="Enter the system prompt for conversation evaluation and scoring..."
                className="min-h-24"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Enable Detailed Logging</Label>
                <p className="text-xs text-muted-foreground">Store full conversation logs for analysis</p>
              </div>
              <Switch checked={enableLogging} onCheckedChange={setEnableLogging} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Simulation Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            Estimated runtime: ~{Math.ceil(batchSize[0] / parallelJobs[0] / 10)} minutes
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline">Save Template</Button>
            <Button className="gap-2" disabled={!sideAModel || !sideBModel || !sideAPrompt || !sideBPrompt}>
              <Zap className="h-4 w-4" />
              Start Simulation
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
