import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Users, FileText, Search } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: "Academic Credential Issuance",
      description:
        "Educational providers can create blockchain-based credentials with academic supervisor endorsements",
      benefits: [
        "Eliminates credential forgery through cryptographic proof",
        "Creates verifiable chain of trust from issuer to supervisor to student",
        "Provides immutable record of academic achievements",
      ],
    },
    {
      icon: CheckCircle,
      title: "Universal Verification System",
      description: "One-click verification of any FairCredit academic credential with public accessibility",
      benefits: [
        "Enables instant trust verification without technical knowledge",
        "Bridges Web3 credentials with Web2 application processes",
        "Eliminates need for manual verification processes",
      ],
    },
    {
      icon: Users,
      title: "Decentralized Provider Ecosystem",
      description: "Open provider ecosystem where anyone can register and immediately issue credentials",
      benefits: [
        "Eliminates barriers to entry by removing provider verification requirements",
        "Enables true decentralization through verifier-specific assessments",
        "Preserves quality through individual verifier due diligence",
      ],
    },
    {
      icon: Search,
      title: "Transparent Verification",
      description: "Each credential generates unique public verification URL with blockchain proof",
      benefits: [
        "Direct blockchain links provide cryptographic proof of authenticity",
        "Publicly accessible verification pages for transparency",
        "Integration with blockchain explorers for technical verification",
      ],
    },
  ]

  return (
    <section id="features" className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Core Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Academic Verification</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built with cutting-edge blockchain technology to provide the most secure and transparent academic credential
            system available.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <feature.icon className="h-8 w-8 text-primary" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
