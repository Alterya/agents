"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Settings, Zap, Plus, Trash2, Copy } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface PromptModelPair {
  id: string
  prompt: string
  model: string
}

export function ConversationSetup() {
  const [comparisonMode, setComparisonMode] = useState(false)
  const [promptModelPairs, setPromptModelPairs] = useState<PromptModelPair[]>([{ id: "1", prompt: "", model: "" }])
  const [opposingSideMode, setOpposingSideMode] = useState<"scammer" | "custom">("scammer")
  const [customOpposingPrompt, setCustomOpposingPrompt] = useState("")
  const [conversationCount, setConversationCount] = useState("5")

  const models = [
    { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
    { id: "claude-3", name: "Claude 3", provider: "Anthropic" },
    { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
  ]

  const addPromptModelPair = () => {
    const newId = (promptModelPairs.length + 1).toString()
    setPromptModelPairs([...promptModelPairs, { id: newId, prompt: "", model: "" }])
  }

  const removePromptModelPair = (id: string) => {
    if (promptModelPairs.length > 1) {
      setPromptModelPairs(promptModelPairs.filter((pair) => pair.id !== id))
    }
  }

  const updatePromptModelPair = (id: string, field: "prompt" | "model", value: string) => {
    setPromptModelPairs(promptModelPairs.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair)))
  }

  const duplicatePromptModelPair = (id: string) => {
    const pairToDuplicate = promptModelPairs.find((pair) => pair.id === id)
    if (pairToDuplicate) {
      const newId = (promptModelPairs.length + 1).toString()
      setPromptModelPairs([...promptModelPairs, { ...pairToDuplicate, id: newId }])
    }
  }

  const isValid =
    promptModelPairs.every((pair) => pair.prompt && pair.model) &&
    (opposingSideMode === "scammer" || customOpposingPrompt)

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Scammer Detection Simulation</h2>
          <p className="text-sm text-muted-foreground">
            {comparisonMode
              ? "Compare multiple prompts and models"
              : "Test your prompt against simulated scammer conversations"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 p-4 bg-muted/30 rounded-lg">
        <Switch checked={comparisonMode} onCheckedChange={setComparisonMode} id="comparison-mode" />
        <label htmlFor="comparison-mode" className="text-sm font-medium">
          Enable Comparison Mode
        </label>
        <span className="text-xs text-muted-foreground">Compare multiple prompt/model combinations side by side</span>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium">
              {comparisonMode ? "Prompt & Model Combinations" : "Your Detection Prompt"}
            </label>
            {comparisonMode && (
              <Button variant="outline" size="sm" onClick={addPromptModelPair} className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Add Combination
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {promptModelPairs.map((pair, index) => (
              <div key={pair.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 border rounded-lg">
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {comparisonMode ? `Prompt ${index + 1}` : "Detection Prompt"}
                    </span>
                    {comparisonMode && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicatePromptModelPair(pair.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {promptModelPairs.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePromptModelPair(pair.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <Textarea
                    placeholder="Enter your scammer detection prompt here..."
                    value={pair.prompt}
                    onChange={(e) => updatePromptModelPair(pair.id, "prompt", e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div className="lg:col-span-5">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Model Selection</label>
                  <Select value={pair.model} onValueChange={(value) => updatePromptModelPair(pair.id, "model", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {model.provider}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium">Opposing Side Configuration</label>

          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="scammer-prompt"
                name="opposing-side"
                checked={opposingSideMode === "scammer"}
                onChange={() => setOpposingSideMode("scammer")}
                className="w-4 h-4 text-primary"
              />
              <label htmlFor="scammer-prompt" className="text-sm">
                Use Default Scammer Prompt
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="custom-prompt"
                name="opposing-side"
                checked={opposingSideMode === "custom"}
                onChange={() => setOpposingSideMode("custom")}
                className="w-4 h-4 text-primary"
              />
              <label htmlFor="custom-prompt" className="text-sm">
                Custom Opposing Prompt
              </label>
            </div>
          </div>

          {opposingSideMode === "scammer" ? (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Default scammer prompt will be used automatically for the opposing side
              </span>
            </div>
          ) : (
            <Textarea
              placeholder="Enter custom opposing prompt (e.g., different scammer tactics, user responses, etc.)..."
              value={customOpposingPrompt}
              onChange={(e) => setCustomOpposingPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Conversations to Run</label>
            <Select value={conversationCount} onValueChange={setConversationCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 conversation</SelectItem>
                <SelectItem value="5">5 conversations</SelectItem>
                <SelectItem value="10">10 conversations</SelectItem>
                <SelectItem value="25">25 conversations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button className="w-full" disabled={!isValid}>
              <Play className="h-4 w-4 mr-2" />
              {comparisonMode ? "Start Comparison" : "Start Simulation"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
