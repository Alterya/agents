import { SidebarNav } from "@/components/sidebar-nav"
import { ModelWarsHeader } from "@/components/model-wars/model-wars-header"
import { ConversationSetup } from "@/components/model-wars/conversation-setup"
import { ActiveConversations } from "@/components/model-wars/active-conversations"
import { ConversationAnalysis } from "@/components/model-wars/conversation-analysis"
import { AgentHiveReports } from "@/components/model-wars/agent-hive-reports"
import { PromptScoring } from "@/components/model-wars/prompt-scoring"

export default function ModelWarsPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModelWarsHeader />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          <ConversationSetup />

          {/* Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ActiveConversations />

            <ConversationAnalysis />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <AgentHiveReports />
            <PromptScoring />
          </div>
        </main>
      </div>
    </div>
  )
}
