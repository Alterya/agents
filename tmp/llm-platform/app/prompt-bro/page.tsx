import { SidebarNav } from "@/components/sidebar-nav"
import { PromptBroHeader } from "@/components/prompt-bro/prompt-bro-header"
import { PromptGenerator } from "@/components/prompt-bro/prompt-generator"
import { PromptLibrary } from "@/components/prompt-bro/prompt-library"
import { PromptOptimizer } from "@/components/prompt-bro/prompt-optimizer"
import { PromptVersions } from "@/components/prompt-bro/prompt-versions"

export default function PromptBroPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PromptBroHeader />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Prompt Generator */}
          <PromptGenerator />

          {/* Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Prompt Optimizer */}
            <div className="xl:col-span-2">
              <PromptOptimizer />
            </div>

            {/* Prompt Versions */}
            <div>
              <PromptVersions />
            </div>
          </div>

          {/* Prompt Library */}
          <PromptLibrary />
        </main>
      </div>
    </div>
  )
}
