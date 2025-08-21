import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Library, Search, Star, Download, Copy, Eye } from "lucide-react"

const promptLibrary = [
  {
    id: 1,
    name: "Romance Scam Detector",
    category: "Scammer Detection",
    description: "Identifies romance scam patterns in dating conversations",
    qualityScore: 96,
    usage: 1247,
    rating: 4.9,
    author: "AI Assistant",
    tags: ["romance", "dating", "emotional-manipulation"],
    lastUpdated: "2 days ago",
  },
  {
    id: 2,
    name: "Investment Fraud Analyzer",
    category: "Financial Fraud",
    description: "Detects fake investment opportunities and crypto scams",
    qualityScore: 93,
    usage: 892,
    rating: 4.8,
    author: "John Doe",
    tags: ["investment", "crypto", "financial"],
    lastUpdated: "1 week ago",
  },
  {
    id: 3,
    name: "Phishing Email Scanner",
    category: "Email Security",
    description: "Analyzes emails for phishing attempts and malicious links",
    qualityScore: 91,
    usage: 2156,
    rating: 4.7,
    author: "Security Team",
    tags: ["phishing", "email", "links"],
    lastUpdated: "3 days ago",
  },
  {
    id: 4,
    name: "Tech Support Scam Filter",
    category: "Tech Support",
    description: "Identifies fake technical support calls and messages",
    qualityScore: 89,
    usage: 634,
    rating: 4.6,
    author: "Jane Smith",
    tags: ["tech-support", "phone", "remote-access"],
    lastUpdated: "5 days ago",
  },
  {
    id: 5,
    name: "Social Engineering Detector",
    category: "Social Engineering",
    description: "Recognizes manipulation tactics and information gathering",
    qualityScore: 94,
    usage: 1089,
    rating: 4.8,
    author: "AI Assistant",
    tags: ["social-engineering", "manipulation", "information"],
    lastUpdated: "1 day ago",
  },
  {
    id: 6,
    name: "Charity Scam Identifier",
    category: "Charity Fraud",
    description: "Detects fake charity requests and donation scams",
    qualityScore: 87,
    usage: 423,
    rating: 4.5,
    author: "Community",
    tags: ["charity", "donations", "fake-causes"],
    lastUpdated: "1 week ago",
  },
]

export function PromptLibrary() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Library className="h-5 w-5 text-accent" />
          Prompt Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search prompt library..." className="pl-10" />
        </div>

        {/* Library Grid */}
        <ScrollArea className="h-80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promptLibrary.map((prompt) => (
              <Card key={prompt.id} className="border border-border hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-card-foreground mb-1">{prompt.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{prompt.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {prompt.category}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                      {prompt.qualityScore}/100
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-accent fill-current" />
                      {prompt.rating}
                    </div>
                    <span>•</span>
                    <span>{prompt.usage} uses</span>
                    <span>•</span>
                    <span>{prompt.lastUpdated}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {prompt.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-3 w-3" />
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
