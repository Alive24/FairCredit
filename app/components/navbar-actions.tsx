"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Shield } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { useAppKit, AppKitButton, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraduationCap, Users, UserCheck, Search } from "lucide-react";

type UserType = "provider" | "student" | "supervisor" | "verifier" | null;

export function NavbarActions() {
  const { address } = useAppKitAccount();
  const { open } = useAppKit();
  const [userType, setUserType] = useState<UserType>(null);

  const connected = !!address;
  const walletAddress = address
    ? `${String(address).slice(0, 4)}...${String(address).slice(-4)}`
    : "";

  useEffect(() => {
    const savedUserType = localStorage.getItem("userType") as UserType;
    if (savedUserType) {
      setUserType(savedUserType);
    }
  }, []);

  const handleUserTypeSelection = (type: Exclude<UserType, null>) => {
    setUserType(type);
    localStorage.setItem("userType", type);
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <AppKitButton />
        {connected && userType && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
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
                  localStorage.removeItem("userType");
                  setUserType(null);
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
      {connected && !userType && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="mx-auto w-full max-w-md border-2 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">
                Select Your Role
              </CardTitle>
              <CardDescription className="text-sm">
                Choose how you'll be using FairCredit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              <Button
                onClick={() => handleUserTypeSelection("student")}
                className="h-12 w-full justify-start border-2 bg-transparent text-left transition-all hover:bg-secondary/80 hover:border-primary/20"
                variant="outline"
              >
                <GraduationCap className="mr-3 h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Student</div>
                  <div className="text-xs text-muted-foreground">
                    Apply for credentials
                  </div>
                </div>
              </Button>
              <Button
                onClick={() => handleUserTypeSelection("provider")}
                className="h-12 w-full justify-start border-2 bg-transparent text-left transition-all hover:bg-secondary/80 hover:border-primary/20"
                variant="outline"
              >
                <Users className="mr-3 h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Provider</div>
                  <div className="text-xs text-muted-foreground">
                    Manage courses & review applications
                  </div>
                </div>
              </Button>
              <Button
                onClick={() => handleUserTypeSelection("supervisor")}
                className="h-12 w-full justify-start border-2 bg-transparent text-left transition-all hover:bg-secondary/80 hover:border-primary/20"
                variant="outline"
              >
                <UserCheck className="mr-3 h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium">Supervisor</div>
                  <div className="text-xs text-muted-foreground">
                    Endorse student work
                  </div>
                </div>
              </Button>
              <Button
                onClick={() => handleUserTypeSelection("verifier")}
                className="h-12 w-full justify-start border-2 bg-transparent text-left transition-all hover:bg-secondary/80 hover:border-primary/20"
                variant="outline"
              >
                <Search className="mr-3 h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">Verifier</div>
                  <div className="text-xs text-muted-foreground">
                    Verify credentials
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
