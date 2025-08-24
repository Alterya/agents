import { SidebarNav } from "@/components/sidebar-nav"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { PerformanceOverview } from "@/components/analytics/performance-overview"
import { ModelComparison } from "@/components/analytics/model-comparison"
import { PromptEffectiveness } from "@/components/analytics/prompt-effectiveness"
import { TrendAnalysis } from "@/components/analytics/trend-analysis"

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnalyticsHeader />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Performance Overview */}
          <PerformanceOverview />

          {/* Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Model Comparison */}
            <ModelComparison />

            {/* Prompt Effectiveness */}
            <PromptEffectiveness />
          </div>

          {/* Trend Analysis */}
          <TrendAnalysis />
        </main>
      </div>
    </div>
  )
}
