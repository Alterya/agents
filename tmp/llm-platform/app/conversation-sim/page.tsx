import { SidebarNav } from "@/components/sidebar-nav"
import { ConversationSimHeader } from "@/components/conversation-sim/conversation-sim-header"
import { SimulationSetup } from "@/components/conversation-sim/simulation-setup"
import { ActiveSimulations } from "@/components/conversation-sim/active-simulations"
import { SimulationResults } from "@/components/conversation-sim/simulation-results"
import { ConversationTemplates } from "@/components/conversation-sim/conversation-templates"

export default function ConversationSimPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConversationSimHeader />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Simulation Setup */}
          <SimulationSetup />

          {/* Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Active Simulations */}
            <div className="xl:col-span-2">
              <ActiveSimulations />
            </div>

            {/* Conversation Templates */}
            <div>
              <ConversationTemplates />
            </div>
          </div>

          {/* Simulation Results */}
          <SimulationResults />
        </main>
      </div>
    </div>
  )
}
