import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, Play, Plus } from "lucide-react"

const templates = [
  {
    id: 1,
    name: "Romance Scam v2.0",
    description: "Dating app romance scam scenarios",
    scenarios: 150,
    successRate: 94.2,
    lastUsed: "2 hours ago",
    category: "Romance",
  },
  {
    id: 2,
    name: "Crypto Investment Fraud",
    description: "Fake cryptocurrency investment schemes",
    scenarios: 89,
    successRate: 91.8,
    lastUsed: "1 day ago",
    category: "Investment",
  },
  {
    id: 3,
    name: "Tech Support Scam",
    description: "Fake technical support scenarios",
    scenarios: 67,
    successRate: 87.3,
    lastUsed: "2 days ago",
    category: "Tech Support",
  },
  {
    id: 4,
    name: "Phishing Email Collection",
    description: "Email phishing attempts and responses",
    scenarios: 234,
    successRate: 89.7,
    lastUsed: "3 days ago",
    category: "Phishing",
  },
  {
    id: 5,
    name: "Social Engineering",
    description: "Information gathering and manipulation",
    scenarios: 112,
    successRate: 85.4,
    lastUsed: "1 week ago",
    category: "Social Eng",
  },
]

export function ConversationTemplates() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <FileText className="h-5 w-5 text-accent" />
          Conversation Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create New Template
          </Button>
        </div>

        <ScrollArea className="h-80">
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="border border-border hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-card-foreground mb-1">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                      {template.scenarios} scenarios
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>Success: {template.successRate}%</span>
                    <span>Used: {template.lastUsed}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Play className="h-3 w-3 mr-1" />
                      Use
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
