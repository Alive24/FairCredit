import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RoleSlideshowSection } from "@/components/role-slideshow-section"
import { FeaturesSection } from "@/components/features-section"
import { WalletDebug } from "@/components/wallet-debug"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="container mx-auto p-4">
          <WalletDebug />
        </div>
        <HeroSection />
        <RoleSlideshowSection />
        <FeaturesSection />
      </main>
    </div>
  )
}
