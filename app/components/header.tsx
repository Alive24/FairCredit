"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { GraduationCap, Wallet, User, LogOut, Users, UserCheck, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function Header() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [userType, setUserType] = useState<"provider" | "student" | "supervisor" | "verifier" | null>(null)

  // Update the connectWallet function to allow role selection
  const connectWallet = () => {
    setIsConnected(true)
    setWalletAddress("7xKX...9mNp")
    // Don't set userType here - let user choose their role
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress("")
    setUserType(null)
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
          {isConnected && userType && (
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
                <Link href="/programs" className="text-sm font-medium hover:text-primary transition-colors">
                  Programs
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <ModeToggle />
          {isConnected ? (
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
                    <Link href="/programs">Programs</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={disconnectWallet}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={connectWallet} className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
      {isConnected && !userType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Select Your Role</CardTitle>
              <CardDescription>Choose how you'll be using FairCredit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setUserType("student")} className="w-full justify-start" variant="outline">
                <GraduationCap className="h-4 w-4 mr-2" />
                Student - Apply for credentials
              </Button>
              <Button onClick={() => setUserType("provider")} className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Provider - Manage programs & review applications
              </Button>
              <Button onClick={() => setUserType("supervisor")} className="w-full justify-start" variant="outline">
                <UserCheck className="h-4 w-4 mr-2" />
                Supervisor - Endorse student work
              </Button>
              <Button onClick={() => setUserType("verifier")} className="w-full justify-start" variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Verifier - Verify credentials
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </header>
  )
}
