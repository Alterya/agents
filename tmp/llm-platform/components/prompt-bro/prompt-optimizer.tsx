import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Zap, CheckCircle, Target } from "lucide-react"

const optimizationSuggestions = [
  {
    id: 1,
    type: "clarity",
    title: "Improve Clarity",
    description: "Add more specific instructions for edge cases",
    impact: "high",
    effort: "low",
    before: "Analyze the conversation for scam indicators",
    after:
      "Analyze the conversation for specific scam indicators including emotional manipulation, urgency tactics, and financial requests",
  },
  {
    id: 2,
    type: "structure",
    title: "Better Structure",
    description: "Use numbered steps for clearer workflow",
    impact: "medium",
    effort: "low",
    before: "Examine the message and determine if it's fraudulent",
    after: "1. Read the entire message\n2. Identify manipulation tactics\n3. Assess risk level\n4. Provide reasoning",
  },
  {
    id: 3,
    type: "examples",
    title: "Add Examples",
    description: "Include concrete examples of scam patterns",
    impact: "high",
    effort: "medium",
    before: "Look for emotional manipulation",
    after:
      "Look for emotional manipulation such as:\n- 'I'm in desperate need of help'\n- 'This is urgent, please respond quickly'\n- 'You're the only one who can help me'",
  },
  {
    id: 4,
    type: "constraints",
    title: "Add Constraints",
    description: "Define output format more precisely",
    impact: "medium",
    effort: "low",
    before: "Provide your assessment",
    after: "Provide your assessment in exactly 3 sentences: risk level, key indicators, and recommendation",
  },
]

const qualityMetrics = [
  { name: "Clarity", score: 87, target: 90 },
  { name: "Specificity", score: 92, target: 85 },
  { name: "Completeness", score: 78, target: 90 },
  { name: "Consistency", score: 94, target: 85 },
]

export function PromptOptimizer() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Zap className="h-5 w-5 text-accent" />
          Prompt Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Quality Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            {qualityMetrics.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metric.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metric.score}/100</span>
                    {metric.score >= metric.target ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Target className="h-4 w-4 text-accent" />
                    )}
                  </div>
                </div>
                <Progress value={metric.score} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Optimization Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Optimization Suggestions</h4>
            <Button size="sm" className="gap-1">
              <Zap className="h-3 w-3" />
              Apply All
            </Button>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-3">
              {optimizationSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm">{suggestion.title}</h5>
                          <Badge
                            className={`text-xs ${
                              suggestion.impact === "high"
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-accent/10 text-accent hover:bg-accent/20"
                            }`}
                          >
                            {suggestion.impact} impact
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.effort} effort
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{suggestion.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Before:</span>
                        <div className="bg-muted/50 p-2 rounded text-xs mt-1 font-mono">{suggestion.before}</div>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">After:</span>
                        <div className="bg-primary/5 p-2 rounded text-xs mt-1 font-mono">{suggestion.after}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="bg-transparent">
                        Apply
                      </Button>
                      <Button variant="ghost" size="sm">
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
