"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Zap,
  Scale,
  Wand2,
  Bug,
  Activity,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Play,
  Menu,
  X,
} from "lucide-react"

export default function AgentWarsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const stats = [
    { label: "Active Battles", value: "12", change: "+3", icon: Zap, color: "text-primary" },
    { label: "Conversations Analyzed", value: "1,247", change: "+156", icon: Activity, color: "text-primary" },
    { label: "Scammer Detection Rate", value: "94.2%", change: "+2.1%", icon: Shield, color: "text-primary" },
    { label: "Prompts Generated", value: "89", change: "+12", icon: Wand2, color: "text-primary" },
  ]

  const recentActivity = [
    { type: "battle", description: "GPT-4 vs Claude battle completed", time: "2 min ago", status: "success" },
    {
      type: "simulation",
      description: "Scale test with 50 conversations finished",
      time: "5 min ago",
      status: "success",
    },
    { type: "prompt", description: "New scammer detection prompt created", time: "12 min ago", status: "warning" },
    { type: "analysis", description: "Agent Hive analysis report generated", time: "18 min ago", status: "success" },
  ]

  const quickActions = [
    {
      title: "Start Battle",
      description: "Run single conversation with live transcript",
      icon: Zap,
      href: "/model-wars",
      color: "bg-primary hover:bg-primary/90", // Using consistent primary color
    },
    {
      title: "Scale Testing",
      description: "Run bulk conversations and analyze results",
      icon: Scale,
      href: "/conversation-sim",
      color: "bg-secondary hover:bg-secondary/90 text-foreground", // Using secondary beige color
    },
    {
      title: "PromptBRO",
      description: "Generate and optimize prompts with AI",
      icon: Wand2,
      href: "/prompt-bro",
      color: "bg-muted hover:bg-muted/90 text-foreground", // Using muted beige color
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Agent Wars</h1>
                <p className="text-sm text-muted-foreground">Scammer Detection Platform</p>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-primary/10">
              Hub
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-primary/10">
              Scale
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-primary/10">
              PromptBRO
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-primary/10">
              <Bug className="h-4 w-4 mr-2" />
              LLM Debug
            </Button>
          </nav>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">Monitor your scammer detection battles and optimize your prompts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Choose where to start your scammer detection workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickActions.map((action, index) => (
                  <div key={index} className="group">
                    <Button
                      className={`w-full h-auto p-6 ${action.color} text-white justify-start shadow-sm hover:shadow-md transition-all`}
                      asChild
                    >
                      <a href={action.href}>
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <action.icon className="h-6 w-6" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-lg">{action.title}</h3>
                            <p className="text-white/90 text-sm">{action.description}</p>
                          </div>
                        </div>
                      </a>
                    </Button>
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Developer Tools</h4>
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-muted-foreground hover:bg-primary/10 hover:border-primary/50 bg-transparent"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    LLM Debug Console
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div
                      className={`p-1 rounded-full ${
                        activity.status === "success"
                          ? "bg-emerald-500/20"
                          : activity.status === "warning"
                            ? "bg-amber-500/20"
                            : "bg-red-500/20"
                      }`}
                    >
                      {activity.status === "success" ? (
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">API Response Time</span>
                    <span className="text-emerald-600">142ms</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Model Availability</span>
                    <span className="text-emerald-600">98%</span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Queue Processing</span>
                    <span className="text-amber-600">76%</span>
                  </div>
                  <Progress value={76} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
