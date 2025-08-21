import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitBranch, Star, Download, Eye, Clock } from "lucide-react"

const promptVersions = [
  {
    id: 1,
    version: "v3.1",
    name: "Scammer Detection Pro",
    status: "current",
    qualityScore: 94,
    performance: 92.1,
    created: "2 hours ago",
    author: "AI Assistant",
    changes: "Improved clarity and added examples",
    starred: true,
  },
  {
    id: 2,
    version: "v3.0",
    name: "Scammer Detection Pro",
    status: "previous",
    qualityScore: 87,
    performance: 89.7,
    created: "1 day ago",
    author: "John Doe",
    changes: "Added structured output format",
    starred: false,
  },
  {
    id: 3,
    version: "v2.9",
    name: "Scammer Detection Pro",
    status: "archived",
    qualityScore: 82,
    performance: 87.3,
    created: "3 days ago",
    author: "AI Assistant",
    changes: "Enhanced context understanding",
    starred: true,
  },
  {
    id: 4,
    version: "v2.8",
    name: "Scammer Detection Pro",
    status: "archived",
    qualityScore: 79,
    performance: 85.1,
    created: "1 week ago",
    author: "Jane Smith",
    changes: "Initial optimization pass",
    starred: false,
  },
]

export function PromptVersions() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <GitBranch className="h-5 w-5 text-primary" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {promptVersions.map((version) => (
              <Card key={version.id} className="border border-border hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-card-foreground">{version.version}</h4>
                        <Badge
                          className={`text-xs ${
                            version.status === "current"
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : version.status === "previous"
                                ? "bg-accent/10 text-accent hover:bg-accent/20"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {version.status}
                        </Badge>
                        {version.starred && <Star className="h-3 w-3 text-accent fill-current" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{version.changes}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Quality:</span>
                      <span className="ml-1 font-medium text-primary">{version.qualityScore}/100</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Performance:</span>
                      <span className="ml-1 font-medium text-accent">{version.performance}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {version.created}
                    </div>
                    <span>by {version.author}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Star className="h-3 w-3" />
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
