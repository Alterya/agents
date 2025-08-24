import { SidebarNav } from "@/components/sidebar-nav"
import { JobsHeader } from "@/components/jobs/jobs-header"
import { JobQueue } from "@/components/jobs/job-queue"
import { JobScheduler } from "@/components/jobs/job-scheduler"
import { SystemResources } from "@/components/jobs/system-resources"
import { JobHistory } from "@/components/jobs/job-history"

export default function JobsPage() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <JobsHeader />

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Job Scheduler */}
          <JobScheduler />

          {/* Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Job Queue */}
            <div className="xl:col-span-2">
              <JobQueue />
            </div>

            {/* System Resources */}
            <div>
              <SystemResources />
            </div>
          </div>

          {/* Job History */}
          <JobHistory />
        </main>
      </div>
    </div>
  )
}
