"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { GraduationCap, User, Users, UserCheck, Search, Shield } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletButton } from "@/components/wallet-button"
import { DevWalletImport } from "@/components/dev-wallet-import"

export function Header() {
  const { connected, publicKey } = useWallet()
  const [userType, setUserType] = useState<"provider" | "student" | "supervisor" | "verifier" | null>(null)

  const walletAddress = publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : ""

  // Load user type from localStorage on component mount
  useEffect(() => {
    const savedUserType = localStorage.getItem('userType') as "provider" | "student" | "supervisor" | "verifier" | null
    if (savedUserType) {
      setUserType(savedUserType)
    }
  }, [])

  // Save user type to localStorage when it changes
  const handleUserTypeSelection = (type: "provider" | "student" | "supervisor" | "verifier") => {
    setUserType(type)
    localStorage.setItem('userType', type)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">FairCredit</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="text-sm font-medium hover:text-primary transition-colors">
            Features
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
            How It Works
          </Link>
          <Link href="/verify" className="text-sm font-medium hover:text-primary transition-colors">
            Verify
          </Link>
          <Link href="/hub" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Hub
          </Link>
          {connected && userType && (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                {userType === "student"
                  ? "My Applications"
                  : userType === "provider"
                    ? "Dashboard"
                    : userType === "supervisor"
                      ? "Endorsements"
                      : "Verifications"}
              </Link>
              {userType === "student" && (
                <Link href="/credentials" className="text-sm font-medium hover:text-primary transition-colors">
                  My Credentials
                </Link>
              )}
              {userType === "provider" && (
                <Link href="/courses" className="text-sm font-medium hover:text-primary transition-colors">
                  Courses
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <DevWalletImport />
          <ModeToggle />
          <WalletButton />
          {connected && userType && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <User className="h-4 w-4" />
                  {walletAddress}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    {userType === "student"
                      ? "My Applications"
                      : userType === "provider"
                        ? "Dashboard"
                        : userType === "supervisor"
                          ? "Endorsements"
                          : "Verifications"}
                  </Link>
                </DropdownMenuItem>
                {userType === "student" && (
                  <DropdownMenuItem asChild>
                    <Link href="/credentials">My Credentials</Link>
                  </DropdownMenuItem>
                )}
                {userType === "provider" && (
                  <DropdownMenuItem asChild>
                    <Link href="/courses">Courses</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/hub" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Hub Administration
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    localStorage.removeItem('userType')
                    setUserType(null)
                  }}
                  className="cursor-pointer"
                >
                  Change Role
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {connected && !userType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 min-h-screen">
          <Card className="w-full max-w-md mx-auto my-auto shadow-2xl border-2 max-h-[90vh] overflow-y-auto">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">Select Your Role</CardTitle>
              <CardDescription className="text-sm">Choose how you'll be using FairCredit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              <Button 
                onClick={() => handleUserTypeSelection("student")} 
                className="w-full justify-start h-12 text-left bg-transparent hover:bg-secondary/80 border-2 hover:border-primary/20 transition-all"
                variant="outline"
              >
                <GraduationCap className="h-5 w-5 mr-3 text-green-600" />
                <div>
                  <div className="font-medium">Student</div>
                  <div className="text-xs text-muted-foreground">Apply for credentials</div>
                </div>
              </Button>
              <Button 
                onClick={() => handleUserTypeSelection("provider")} 
                className="w-full justify-start h-12 text-left bg-transparent hover:bg-secondary/80 border-2 hover:border-primary/20 transition-all"
                variant="outline"
              >
                <Users className="h-5 w-5 mr-3 text-blue-600" />
                <div>
                  <div className="font-medium">Provider</div>
                  <div className="text-xs text-muted-foreground">Manage courses & review applications</div>
                </div>
              </Button>
              <Button 
                onClick={() => handleUserTypeSelection("supervisor")} 
                className="w-full justify-start h-12 text-left bg-transparent hover:bg-secondary/80 border-2 hover:border-primary/20 transition-all"
                variant="outline"
              >
                <UserCheck className="h-5 w-5 mr-3 text-purple-600" />
                <div>
                  <div className="font-medium">Supervisor</div>
                  <div className="text-xs text-muted-foreground">Endorse student work</div>
                </div>
              </Button>
              <Button 
                onClick={() => handleUserTypeSelection("verifier")} 
                className="w-full justify-start h-12 text-left bg-transparent hover:bg-secondary/80 border-2 hover:border-primary/20 transition-all"
                variant="outline"
              >
                <Search className="h-5 w-5 mr-3 text-orange-600" />
                <div>
                  <div className="font-medium">Verifier</div>
                  <div className="text-xs text-muted-foreground">Verify credentials</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </header>
  )
}
