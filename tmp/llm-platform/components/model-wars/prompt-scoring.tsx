"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, User, MessageCircle, Palette, Shield } from "lucide-react"

export function PromptScoring() {
  const scoringMetrics = [
    {
      name: "Goal Completion",
      score: 8.4,
      icon: Target,
      description: "How well the prompt achieves scammer detection objectives",
      color: "text-blue-600 bg-blue-100",
    },
    {
      name: "Personality Consistency",
      score: 7.8,
      icon: User,
      description: "Maintains consistent character throughout conversation",
      color: "text-green-600 bg-green-100",
    },
    {
      name: "Coherence & Engagement",
      score: 8.1,
      icon: MessageCircle,
      description: "Responses are logical and keep user engaged",
      color: "text-purple-600 bg-purple-100",
    },
    {
      name: "Style Alignment",
      score: 7.5,
      icon: Palette,
      description: "Matches intended tone and communication style",
      color: "text-orange-600 bg-orange-100",
    },
    {
      name: "Robustness",
      score: 8.7,
      icon: Shield,
      description: "Resistant to manipulation and failure modes",
      color: "text-red-600 bg-red-100",
    },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-green-600"
    if (score >= 7.0) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 8.5) return "Excellent"
    if (score >= 7.0) return "Good"
    return "Needs Work"
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Target className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Prompt Scoring Module</h3>
          <p className="text-sm text-muted-foreground">Detailed performance metrics and evaluation</p>
        </div>
      </div>

      <div className="space-y-6">
        {scoringMetrics.map((metric) => {
          const IconComponent = metric.icon
          return (
            <div key={metric.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${metric.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium">{metric.name}</h4>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getScoreColor(metric.score)}`}>{metric.score}/10</div>
                  <Badge variant="outline" className="text-xs">
                    {getScoreBadge(metric.score)}
                  </Badge>
                </div>
              </div>
              <Progress value={metric.score * 10} className="h-2" />
            </div>
          )
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Score</span>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                {(scoringMetrics.reduce((acc, m) => acc + m.score, 0) / scoringMetrics.length).toFixed(1)}/10
              </div>
              <Badge className="bg-green-50 text-green-700">Strong Performance</Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
