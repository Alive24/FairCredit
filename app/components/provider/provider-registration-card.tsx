"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Loader2, Building2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PublicKey } from "@solana/web3.js"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ErrorBoundary } from "@/components/error-boundary"
import { TestTransactionButton } from "./test-transaction-button"

interface ProviderRegistrationCardProps {
  publicKey: PublicKey | null
  client: any
  onRegistrationComplete: () => void
}

export function ProviderRegistrationCard({ 
  publicKey, 
  client, 
  onRegistrationComplete 
}: ProviderRegistrationCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'info' | 'form' | 'submitted'>('info')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    email: '',
    providerType: 'educational'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("Debug - client:", client)
    console.log("Debug - publicKey:", publicKey?.toBase58())
    
    if (!client || !publicKey) {
      toast({
        title: "Error",
        description: `Wallet not connected. Client: ${!!client}, PublicKey: ${!!publicKey}`,
        variant: "destructive"
      })
      return
    }

    // Check if client has the required method
    if (!client.initializeProvider) {
      toast({
        title: "Client Error",
        description: "The connected client doesn't support provider registration. Please ensure your wallet is properly connected and try refreshing the page.",
        variant: "destructive"
      })
      return
    }

    // Validate form
    if (!formData.name || !formData.description || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log("Initializing provider with data:", formData)
      
      const signature = await client.initializeProvider(
        formData.name,
        formData.description,
        formData.website || "https://example.com",
        formData.email,
        formData.providerType
      )
      
      console.log("Provider initialized successfully:", signature)
      
      toast({
        title: "Provider Registration Submitted",
        description: `Your provider account has been created successfully! Transaction: ${signature.slice(0, 8)}...`,
      })
      
      setStep('submitted')
      
      // Wait a moment then trigger refresh
      setTimeout(() => {
        onRegistrationComplete()
      }, 2000)
      
    } catch (error) {
      console.error("Failed to register provider:", error)
      
      let errorMessage = "Failed to register provider. Please try again."
      if (error instanceof Error) {
        if (error.message.includes("already in use")) {
          errorMessage = "Provider account already exists for this wallet."
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for transaction. Please add SOL to your wallet."
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (step === 'submitted') {
    return (
      <Card className="p-8">
        <CardContent className="text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Registration Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Your provider account has been created successfully. The page will refresh automatically.
          </p>
          <div className="p-4 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">Your Wallet Address:</p>
            <p className="font-mono text-xs">{publicKey?.toBase58()}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'form') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Provider Registration
          </CardTitle>
          <CardDescription>
            Complete the form below to register as a course provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your organization name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your organization and educational offerings"
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://your-organization.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@your-organization.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="providerType">Provider Type</Label>
              <Select 
                value={formData.providerType} 
                onValueChange={(value) => handleInputChange('providerType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="educational">Educational Institution</SelectItem>
                  <SelectItem value="corporate">Corporate Training</SelectItem>
                  <SelectItem value="government">Government Agency</SelectItem>
                  <SelectItem value="nonprofit">Non-Profit Organization</SelectItem>
                  <SelectItem value="individual">Individual Educator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertDescription>
                After registration, your provider status will need to be approved by the Hub administrator 
                before you can create courses.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('info')}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Registering..." : "Register Provider"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Default info step
  return (
    <Card className="p-8">
      <CardContent className="text-center">
        <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-4">Provider Registration Required</h2>
        <p className="text-muted-foreground mb-6">
          To become a course provider on FairCredit, you need to register your organization 
          and get approved by the Hub administrator.
        </p>
        <div className="p-4 bg-muted rounded-lg text-sm mb-6">
          <p className="font-medium mb-1">Your Wallet Address:</p>
          <p className="font-mono text-xs">{publicKey?.toBase58()}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Debug: Client ready: {!!client ? 'Yes' : 'No'}
          </p>
        </div>
        <div className="space-y-3">
          <Button 
            onClick={() => setStep('form')} 
            size="lg"
            className="w-full"
            disabled={!client || !publicKey || !client?.initializeProvider}
          >
            Start Provider Registration
          </Button>
          <p className="text-xs text-muted-foreground">
            Registration creates your provider account on the blockchain
          </p>
          {(!client || !publicKey) && (
            <p className="text-xs text-red-500">
              Please ensure your wallet is connected and try refreshing the page
            </p>
          )}
          {client && publicKey && !client?.initializeProvider && (
            <p className="text-xs text-red-500">
              Provider registration requires the full client. Please refresh to reconnect.
            </p>
          )}
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm font-medium mb-2">Test your wallet connection:</p>
            <TestTransactionButton />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}