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
        <HeroSection />
        <RoleSlideshowSection />
        <FeaturesSection />
        <div className="container mx-auto p-4 mt-8">
          <WalletDebug />
        </div>
      </main>
    </div>
  )
}
