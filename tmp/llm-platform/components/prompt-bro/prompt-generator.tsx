"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Wand2, Sparkles, Copy, RefreshCw, Zap } from "lucide-react"

const promptTypes = [
  { id: "scammer-detection", name: "Scammer Detection", description: "Identify potential scam attempts" },
  { id: "phishing-analysis", name: "Phishing Analysis", description: "Analyze suspicious communications" },
  { id: "social-engineering", name: "Social Engineering", description: "Detect manipulation tactics" },
  { id: "fraud-prevention", name: "Fraud Prevention", description: "General fraud detection prompts" },
  { id: "custom", name: "Custom Mission", description: "Define your own mission-driven task" },
]

const toneOptions = [
  { id: "professional", name: "Professional" },
  { id: "conversational", name: "Conversational" },
  { id: "authoritative", name: "Authoritative" },
  { id: "empathetic", name: "Empathetic" },
  { id: "analytical", name: "Analytical" },
]

export function PromptGenerator() {
  const [promptType, setPromptType] = useState("")
  const [tone, setTone] = useState("")
  const [requirements, setRequirements] = useState("")
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [includeExamples, setIncludeExamples] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setGeneratedPrompt(`You are an expert fraud detection specialist with extensive experience in identifying scammer tactics and social engineering attempts. Your mission is to analyze conversations and communications to determine if they contain potential scam indicators.

## Your Task
Carefully examine the provided conversation or message and assess whether it shows signs of fraudulent activity, specifically focusing on:
- Emotional manipulation tactics
- Urgency and pressure techniques
- Requests for personal information
- Financial solicitation patterns
- Trust-building followed by exploitation

## Analysis Framework
1. **Context Assessment**: Evaluate the setting and relationship dynamics
2. **Language Patterns**: Look for manipulation indicators and emotional triggers
3. **Request Analysis**: Examine any asks for information, money, or actions
4. **Risk Evaluation**: Determine the likelihood of fraudulent intent

## Response Format
Provide your assessment in this structure:
- **Risk Level**: [Low/Medium/High]
- **Confidence**: [Percentage]
- **Key Indicators**: [List specific red flags identified]
- **Reasoning**: [Brief explanation of your assessment]
- **Recommendations**: [Suggested actions for the recipient]

Remember to be thorough but concise, and always err on the side of caution when protecting potential victims.`)
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Wand2 className="h-5 w-5 text-primary" />
          AI Prompt Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Prompt Type</Label>
            <Select value={promptType} onValueChange={setPromptType}>
              <SelectTrigger>
                <SelectValue placeholder="Select prompt type" />
              </SelectTrigger>
              <SelectContent>
                {promptTypes.map((type) => (
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
            <Label className="text-sm font-medium">Tone & Style</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Prompt Name</Label>
            <Input placeholder="e.g., Scammer Detection v3.1" />
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Specific Requirements & Context</Label>
          <Textarea
            placeholder="Describe your specific needs, context, or requirements for this prompt..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="min-h-24"
          />
        </div>

        {/* Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="include-examples" checked={includeExamples} onCheckedChange={setIncludeExamples} />
            <Label htmlFor="include-examples" className="text-sm">
              Include examples in prompt
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 bg-transparent">
              <RefreshCw className="h-4 w-4" />
              Use Template
            </Button>
            <Button onClick={handleGenerate} disabled={!promptType || isGenerating} className="gap-2">
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Generate Prompt
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Generated Prompt */}
        {generatedPrompt && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Generated Prompt</Label>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Quality Score: 94/100</Badge>
                <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="relative">
              <Textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                className="min-h-48 font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-transparent">
                Test Prompt
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent">
                Optimize
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent">
                Save Version
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
