"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Brain, TrendingUp, AlertCircle, Lightbulb } from "lucide-react"

export function AgentHiveReports() {
  const reports = [
    {
      id: "report-1",
      timestamp: "2 minutes ago",
      conversationsAnalyzed: 5,
      status: "completed",
      findings: {
        criticalIssues: 2,
        improvements: 4,
        strengths: 3,
      },
      summary:
        "Prompt shows strong scam detection but lacks consistency in tone when dealing with persistent scammers.",
      recommendations: [
        "Add explicit tone guidelines for escalating situations",
        "Include more specific examples of common scam tactics",
        "Strengthen the personality consistency instructions",
      ],
    },
    {
      id: "report-2",
      timestamp: "15 minutes ago",
      conversationsAnalyzed: 10,
      status: "completed",
      findings: {
        criticalIssues: 1,
        improvements: 6,
        strengths: 5,
      },
      summary: "Good overall performance with room for improvement in handling edge cases and maintaining character.",
      recommendations: [
        "Refine handling of ambiguous scenarios",
        "Add fallback responses for unexpected inputs",
        "Improve context retention across longer conversations",
      ],
    },
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Agent Hive Analysis</h3>
          <p className="text-sm text-muted-foreground">AI-powered prompt optimization insights</p>
        </div>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{report.conversationsAnalyzed} conversations</Badge>
                <span className="text-sm text-muted-foreground">{report.timestamp}</span>
              </div>
              <Badge className="bg-green-50 text-green-700">{report.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-2 bg-red-50 rounded">
                <div className="text-lg font-semibold text-red-600">{report.findings.criticalIssues}</div>
                <div className="text-xs text-red-600">Critical Issues</div>
              </div>
              <div className="p-2 bg-yellow-50 rounded">
                <div className="text-lg font-semibold text-yellow-600">{report.findings.improvements}</div>
                <div className="text-xs text-yellow-600">Improvements</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="text-lg font-semibold text-green-600">{report.findings.strengths}</div>
                <div className="text-xs text-green-600">Strengths</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Summary
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">{report.summary}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recommendations
                </h4>
                <ScrollArea className="h-20">
                  <ul className="text-sm space-y-1">
                    {report.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full bg-transparent">
              <TrendingUp className="h-3 w-3 mr-2" />
              Apply Suggestions
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
