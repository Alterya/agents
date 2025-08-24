"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Swords, Settings, Zap } from "lucide-react"

const models = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI", status: "available" },
  { id: "gpt-3.5", name: "GPT-3.5 Turbo", provider: "OpenAI", status: "available" },
  { id: "claude-3", name: "Claude-3 Opus", provider: "Anthropic", status: "available" },
  { id: "claude-3-sonnet", name: "Claude-3 Sonnet", provider: "Anthropic", status: "available" },
  { id: "llama-2", name: "Llama-2 70B", provider: "Meta", status: "available" },
  { id: "mistral", name: "Mistral Large", provider: "Mistral AI", status: "limited" },
]

const battleTypes = [
  { id: "scammer-detection", name: "Scammer Detection", description: "Identify potential scam attempts" },
  { id: "phishing-analysis", name: "Phishing Analysis", description: "Analyze suspicious emails and messages" },
  { id: "social-engineering", name: "Social Engineering", description: "Detect manipulation tactics" },
  { id: "custom", name: "Custom Prompt", description: "Use your own evaluation criteria" },
]

export function BattleSetup() {
  const [selectedModel1, setSelectedModel1] = useState("")
  const [selectedModel2, setSelectedModel2] = useState("")
  const [battleType, setBattleType] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Swords className="h-5 w-5 text-primary" />
          Setup New Battle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Model 1 (Challenger)</Label>
            <Select value={selectedModel1} onValueChange={setSelectedModel1}>
              <SelectTrigger>
                <SelectValue placeholder="Select first model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id} disabled={model.status === "limited"}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                        {model.status === "limited" && (
                          <Badge variant="secondary" className="text-xs">
                            Limited
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Model 2 (Defender)</Label>
            <Select value={selectedModel2} onValueChange={setSelectedModel2}>
              <SelectTrigger>
                <SelectValue placeholder="Select second model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    disabled={model.status === "limited" || model.id === selectedModel1}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                        {model.status === "limited" && (
                          <Badge variant="secondary" className="text-xs">
                            Limited
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Battle Type */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Battle Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {battleTypes.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  battleType === type.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setBattleType(type.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{type.name}</h4>
                    {battleType === type.id && (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        {battleType === "custom" && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Custom Evaluation Prompt</Label>
            <Textarea
              placeholder="Enter your custom prompt for evaluation..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-24"
            />
          </div>
        )}

        <Separator />

        {/* Battle Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4" />
            Advanced settings available after battle start
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline">Save Template</Button>
            <Button className="gap-2" disabled={!selectedModel1 || !selectedModel2 || !battleType}>
              <Zap className="h-4 w-4" />
              Start Battle
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
