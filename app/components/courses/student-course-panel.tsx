"use client";

import { useCallback, useEffect, useState } from "react";
import { address, type Address } from "@solana/kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  GraduationCap,
  CheckCircle,
  Clock,
  Shield,
} from "lucide-react";
import { AppKitButton } from "@reown/appkit/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { useToast } from "@/hooks/use-toast";
import { fetchMaybeCredential } from "@/lib/solana/generated/accounts/credential";
import type { Credential } from "@/lib/solana/generated/accounts/credential";
import { getCreateCredentialInstructionAsync } from "@/lib/solana/generated/instructions/createCredential";
import { getCredentialPDA, getProviderPDA } from "@/lib/solana/pda";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import type { Course } from "@/lib/solana/generated/accounts/course";
import { CredentialStatus } from "@/lib/solana/generated/types/credentialStatus";
import { useUserRole } from "@/hooks/use-user-role";

interface StudentCoursePanelProps {
  courseAddress: string;
  course: Course;
}

function getCredentialStatusInfo(status: CredentialStatus) {
  switch (status) {
    case CredentialStatus.Pending:
      return {
        label: "Registered",
        description:
          "You are registered for this course. Complete activities and request endorsement when ready.",
        icon: Clock,
        badgeClass:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      };
    case CredentialStatus.Endorsed:
      return {
        label: "Endorsed",
        description:
          "Your supervisor has endorsed your work. Awaiting provider approval.",
        icon: Shield,
        badgeClass:
          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      };
    case CredentialStatus.Verified:
      return {
        label: "Approved",
        description:
          "Your credential has been approved by the provider. You can now mint your NFT credential.",
        icon: CheckCircle,
        badgeClass:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      };
    case CredentialStatus.Minted:
      return {
        label: "NFT Minted",
        description: "Your credential NFT has been minted on-chain.",
        icon: CheckCircle,
        badgeClass:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      };
    default:
      return {
        label: "Unknown",
        description: "",
        icon: Clock,
        badgeClass: "bg-muted text-muted-foreground",
      };
  }
}

export function StudentCoursePanel({
  courseAddress,
  course,
}: StudentCoursePanelProps) {
  const { rpc } = useFairCredit();
  const {
    address: walletAddress,
    isConnected,
    sendTransaction,
    isSending,
  } = useAppKitTransaction();
  const { toast } = useToast();

  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Check if current user already has a credential for this course
  const loadCredential = useCallback(async () => {
    if (!walletAddress || !courseAddress) {
      setLoading(false);
      return;
    }
    try {
      const credentialPDA = await getCredentialPDA(
        address(courseAddress),
        address(walletAddress),
      );
      const acc = await fetchMaybeCredential(rpc, credentialPDA);
      if (acc?.exists) {
        setCredential(acc.data);
      } else {
        setCredential(null);
      }
    } catch (e) {
      console.error("Failed to load credential:", e);
      setCredential(null);
    } finally {
      setLoading(false);
    }
  }, [rpc, walletAddress, courseAddress]);

  useEffect(() => {
    loadCredential();
  }, [loadCredential]);

  // Don't render if user is the provider AND acting as provider
  const { role } = useUserRole();

  if (
    isConnected &&
    walletAddress &&
    String(course.provider).toLowerCase() ===
      String(walletAddress).toLowerCase() &&
    role === "provider"
  ) {
    return null;
  }

  // Not connected state
  if (!isConnected || !walletAddress) {
    return (
      <Card className="mt-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                Register for this Course
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your wallet to start your learning journey.
              </p>
            </div>
            <AppKitButton />
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRegister = async () => {
    if (!walletAddress || !courseAddress) return;

    setRegistering(true);
    try {
      // Derive provider PDA from the course's provider wallet
      const providerPDA = await getProviderPDA(
        address(String(course.provider)),
      );

      const ix = await getCreateCredentialInstructionAsync({
        course: address(courseAddress),
        provider: providerPDA,
        student: createPlaceholderSigner(walletAddress),
      });

      await sendTransaction([ix]);

      toast({
        title: "Successfully registered!",
        description: "You are now registered for this course.",
      });

      // Reload credential after a short delay
      setTimeout(() => loadCredential(), 2000);
    } catch (e: any) {
      console.error("Registration failed:", e);
      toast({
        title: "Registration failed",
        description: e?.message || "Failed to register for this course.",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground text-sm">
            Checking registration status…
          </span>
        </CardContent>
      </Card>
    );
  }

  // Already registered — show status
  if (credential) {
    const statusInfo = getCredentialStatusInfo(
      credential.status as CredentialStatus,
    );
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="mt-6 border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Your Enrollment
            </CardTitle>
            <Badge className={statusInfo.badgeClass}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {statusInfo.description}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Registered</p>
              <p className="font-medium">
                {new Date(
                  Number(credential.created) * 1000,
                ).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {new Date(
                  Number(credential.updated) * 1000,
                ).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Future: Activity list and "Finish Course" button will go here */}
        </CardContent>
      </Card>
    );
  }

  // Not registered — show register button
  return (
    <Card className="mt-6">
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
              Register for this Course
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a credential record on-chain to track your progress.
            </p>
          </div>
          <Button
            onClick={handleRegister}
            disabled={registering || isSending}
            size="lg"
          >
            {registering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registering…
              </>
            ) : (
              "Register"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
