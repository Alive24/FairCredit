import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RoleSlideshowSection } from "@/components/role-slideshow-section"
import { FeaturesSection } from "@/components/features-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <RoleSlideshowSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  )
}
