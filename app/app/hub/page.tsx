import { Header } from "@/components/header"
import { HubDashboard } from "@/components/dashboards/hub-dashboard"
import { Shield } from "lucide-react"

export default function HubPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Hub Administration</h1>
            <p className="text-muted-foreground">
              Manage the FairCredit platform registry and curation
            </p>
          </div>
        </div>
        <HubDashboard />
      </main>
    </div>
  )
}