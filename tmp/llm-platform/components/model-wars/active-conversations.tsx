"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MessageSquare, Clock, TrendingUp, AlertTriangle } from "lucide-react"

export function ActiveConversations() {
  const activeConversations = [
    {
      id: "conv-1",
      model: "GPT-4",
      status: "running",
      progress: 65,
      turns: 8,
      duration: "2m 34s",
      currentScore: 7.2,
      riskLevel: "medium",
    },
    {
      id: "conv-2",
      model: "Claude 3",
      status: "running",
      progress: 45,
      turns: 5,
      duration: "1m 12s",
      currentScore: 8.1,
      riskLevel: "low",
    },
    {
      id: "conv-3",
      model: "GPT-3.5",
      status: "completed",
      progress: 100,
      turns: 12,
      duration: "4m 18s",
      currentScore: 6.8,
      riskLevel: "high",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600 bg-green-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "high":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Active Conversations</h3>
          <p className="text-sm text-muted-foreground">Real-time scammer simulation progress</p>
        </div>
      </div>

      <div className="space-y-4">
        {activeConversations.map((conv) => (
          <div key={conv.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(conv.status)}`} />
                <span className="font-medium">{conv.model}</span>
                <Badge variant="outline" className="text-xs">
                  {conv.status}
                </Badge>
              </div>
              <Badge className={getRiskColor(conv.riskLevel)}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {conv.riskLevel} risk
              </Badge>
            </div>

            <Progress value={conv.progress} className="h-2" />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {conv.turns} turns
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {conv.duration}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">{conv.currentScore}/10</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
