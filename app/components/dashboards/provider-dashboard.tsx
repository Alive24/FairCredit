"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Users,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  Loader2,
  Award,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useAppKitAccount } from "@reown/appkit/react";
import { useToast } from "@/hooks/use-toast";
import { useIsHubAuthority } from "@/hooks/use-is-hub-authority";
import { ProviderRegistrationCard } from "@/components/provider/provider-registration-card";
import { CloseProviderCard } from "@/components/provider/close-provider-card";
import { WalletDebug } from "@/components/wallet-debug";
import { address } from "@solana/kit";
import type { Address } from "@solana/kit";
import {
  fetchMaybeHub,
  fetchMaybeProvider,
} from "@/lib/solana/generated/accounts";
import type { Hub, Provider } from "@/lib/solana/generated/accounts";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { getAddAcceptedProviderInstructionAsync } from "@/lib/solana/generated/instructions/addAcceptedProvider";
import { getApproveCredentialInstructionAsync } from "@/lib/solana/generated/instructions/approveCredential";
import { getUpdateCourseStatusInstructionAsync } from "@/lib/solana/generated/instructions/updateCourseStatus";
import { getAddProviderEndorserInstructionAsync } from "@/lib/solana/generated/instructions/addProviderEndorser";
import { getRemoveProviderEndorserInstructionAsync } from "@/lib/solana/generated/instructions/removeProviderEndorser";
import { DEFAULT_PLACEHOLDER_SIGNER } from "@/lib/solana/placeholder-signer";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { useCredentials } from "@/hooks/use-credentials";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { CredentialStatus } from "@/lib/solana/generated/types/credentialStatus";
import { CourseStatus } from "@/lib/solana/generated/types/courseStatus";
import { useCourses } from "@/hooks/use-courses";
import { Input } from "@/components/ui/input";

export function ProviderDashboard() {
  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected: connected } = useAppKitAccount();
  const { isHubAuthority } = useIsHubAuthority();
  const {
    credentials,
    loading: credentialsLoading,
    refetch: refetchCredentials,
  } = useCredentials(walletAddress ?? null);
  const { sendTransaction, isSending } = useAppKitTransaction();
  const publicKey = walletAddress ? address(walletAddress) : null;
  const isWalletConnected = connected;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<any>(null);
  const [hubData, setHubData] = useState<any>(null);
  const [hubAddress, setHubAddress] = useState<Address | null>(null);
  const [providerAccountAddress, setProviderAccountAddress] =
    useState<Address | null>(null);
  const {
    courses: providerCourseEntries,
    loading: coursesLoading,
    refetch: refetchCourses,
  } = useCourses(walletAddress ? [walletAddress] : null);

  const loadProviderData = useCallback(async () => {
    if (!isWalletConnected || !publicKey || !walletAddress) {
      setLoading(false);
      return;
    }

    try {
      const hubInstruction = await getUpdateHubConfigInstructionAsync({
        hub: undefined,
        authority: DEFAULT_PLACEHOLDER_SIGNER,
        config: {
          requireProviderApproval: false,
          minReputationScore: 0,
        },
      });
      const nextHubAddress = hubInstruction.accounts[0].address;
      setHubAddress(nextHubAddress);
      const hubAccount = await fetchMaybeHub(rpc, nextHubAddress);
      const hub = hubAccount.exists ? hubAccount.data : null;
      if (!hub) {
        setHubData(null);
        setLoading(false);
        return;
      }
      setHubData(hub);

      try {
        const providerInstruction = await getAddAcceptedProviderInstructionAsync(
          {
            hub: undefined,
            authority: DEFAULT_PLACEHOLDER_SIGNER,
            provider: undefined,
            providerWallet: address(walletAddress),
          }
        );
        const providerAddress = providerInstruction.accounts[2].address;
        setProviderAccountAddress(providerAddress);
        const providerAccount = await fetchMaybeProvider(rpc, providerAddress);
        if (providerAccount.exists) {
          setProviderData(providerAccount.data);
        }
      } catch (error) {
        console.log("Provider not found, showing registration");
      }
    } catch (error) {
      console.error("Failed to fetch provider data:", error);
      toast({
        title: "Error",
        description: "Failed to load provider data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isWalletConnected, publicKey, walletAddress, rpc, toast]);

  useEffect(() => {
    loadProviderData();
  }, [loadProviderData]);

  const hasProviderAccount = !!providerData;
  const isAcceptedProvider = Boolean(
    hubData?.acceptedProviders?.some((p: Address) => {
      const providerAddress = typeof p === "string" ? p : String(p);
      return providerAddress === walletAddress;
    })
  );

  // Calculate stats based on real data (providerCourseEntries = { course, address }[])
  const verifiedCourseCount = providerCourseEntries.filter(
    (entry) => entry.course?.status === CourseStatus.Verified
  ).length;
  const draftCourseCount = providerCourseEntries.filter(
    (entry) => entry.course?.status === CourseStatus.Draft
  ).length;
  const issuedCredentialCount = credentials.filter(
    ({ credential }) =>
      credential.status === CredentialStatus.Verified ||
      credential.status === CredentialStatus.Minted
  ).length;
  const stats = [
    {
      title: "Total Courses",
      value: providerCourseEntries.length.toString(),
      icon: FileText,
      color: "text-blue-600",
      subtitle: "Across all statuses",
    },
    {
      title: "Verified Courses",
      value: verifiedCourseCount.toString(),
      icon: CheckCircle,
      color: "text-green-600",
      subtitle: "Ready for hub acceptance",
    },
    {
      title: "Draft Courses",
      value: draftCourseCount.toString(),
      icon: Clock,
      color: "text-yellow-600",
      subtitle: "Still being prepared",
    },
    {
      title: "Credentials Issued",
      value: issuedCredentialCount.toString(),
      icon: Award,
      color: "text-purple-600",
      subtitle: "Verified or minted",
    },
  ];

  const [approvingCredential, setApprovingCredential] = useState<string | null>(
    null
  );
  const [submittingForReview, setSubmittingForReview] = useState<string | null>(
    null
  );
  const [newEndorser, setNewEndorser] = useState("");
  const [addingEndorser, setAddingEndorser] = useState(false);
  const [removingEndorser, setRemovingEndorser] = useState<string | null>(null);

  const handleSubmitForHubReview = async (courseAddress: string) => {
    if (!walletAddress) return;
    setSubmittingForReview(courseAddress);
    try {
      const ix = await getUpdateCourseStatusInstructionAsync({
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
        status: CourseStatus.Verified,
        rejectionReason: null,
      });
      await sendTransaction([ix]);
      toast({
        title: "Course submitted for Hub review",
        description: "Hub can now accept this course.",
      });
      refetchCourses();
    } catch (e) {
      console.error("Submit for review failed:", e);
      toast({
        title: "Submit failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSubmittingForReview(null);
    }
  };

  const handleAddEndorser = async () => {
    if (!walletAddress || !hubAddress || !newEndorser) {
      toast({
        title: "Missing information",
        description: "Enter an endorser wallet before adding.",
        variant: "destructive",
      });
      return;
    }
    setAddingEndorser(true);
    try {
      const ix = await getAddProviderEndorserInstructionAsync({
        providerAccount: providerAccountAddress ?? undefined,
        hub: hubAddress,
        providerAuthority: createPlaceholderSigner(walletAddress),
        endorserWallet: address(newEndorser),
      });
      await sendTransaction([ix]);
      toast({
        title: "Endorser added",
        description: "This wallet can now endorse for you.",
      });
      setNewEndorser("");
      await loadProviderData();
    } catch (e) {
      console.error("Add endorser failed:", e);
      toast({
        title: "Add endorser failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setAddingEndorser(false);
    }
  };

  const handleRemoveEndorser = async (endorser: string) => {
    if (!walletAddress || !hubAddress) return;
    setRemovingEndorser(endorser);
    try {
      const ix = await getRemoveProviderEndorserInstructionAsync({
        providerAccount: providerAccountAddress ?? undefined,
        hub: hubAddress,
        providerAuthority: createPlaceholderSigner(walletAddress),
        endorserWallet: address(endorser),
      });
      await sendTransaction([ix]);
      toast({
        title: "Endorser removed",
        description: "This wallet can no longer endorse for you.",
      });
      await loadProviderData();
    } catch (e) {
      console.error("Remove endorser failed:", e);
      toast({
        title: "Remove endorser failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRemovingEndorser(null);
    }
  };

  const handleApproveCredential = async (
    credentialAddress: string,
    courseAddress: string
  ) => {
    if (!walletAddress) return;
    setApprovingCredential(credentialAddress);
    try {
      const ix = await getApproveCredentialInstructionAsync({
        credential: address(credentialAddress),
        course: address(courseAddress),
        providerAuthority: createPlaceholderSigner(walletAddress),
      });
      await sendTransaction([ix]);
      toast({
        title: "Credential approved",
        description: "Credential added to course and set to Verified.",
      });
      refetchCredentials();
    } catch (e) {
      console.error("Approve credential failed:", e);
      toast({
        title: "Approve failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setApprovingCredential(null);
    }
  };

  const endorsedCredentials = credentials.filter(
    (e) => e.credential.status === CredentialStatus.Endorsed
  );

  const getStatusBadge = (status?: CourseStatus | string) => {
    switch (status) {
      case CourseStatus.Draft:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Draft
          </Badge>
        );
      case CourseStatus.Verified:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Verified
          </Badge>
        );
      case CourseStatus.Rejected:
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Rejected
          </Badge>
        );
      case CourseStatus.Archived:
        return (
          <Badge className="bg-muted text-muted-foreground">Archived</Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {typeof status === "string" ? status : "Unknown"}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === "development" && <WalletDebug />}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Provider Dashboard</h1>
            <p className="text-muted-foreground">
              {isAcceptedProvider
                ? "Manage your courses and review student applications"
                : "Register as a provider to start creating courses"}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/courses/create">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Course
              </Button>
            </Link>
          </div>
        </div>

        {loading || (isAcceptedProvider && coursesLoading) ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !isWalletConnected ? (
          <Card className="p-8">
            <CardContent className="text-center">
              <h2 className="text-2xl font-semibold mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-muted-foreground mb-6">
                Please connect your wallet to access the provider dashboard
              </p>
            </CardContent>
          </Card>
        ) : !hasProviderAccount ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Initialize Provider</CardTitle>
                <CardDescription>
                  Register as a provider on-chain. Use the form below to create
                  your provider account (re-init option).
                </CardDescription>
              </CardHeader>
            </Card>
            <ProviderRegistrationCard
              publicKey={publicKey}
              onRegistrationComplete={() => {
                window.location.reload();
              }}
            />
          </div>
        ) : !isAcceptedProvider ? (
          <Card className="p-8">
            <CardContent className="text-center">
              <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Pending Approval</h2>
              <p className="text-muted-foreground mb-6">
                Your provider account has been created and is pending approval
                from the Hub administrator.
              </p>
              <div className="p-4 bg-muted rounded-lg text-left space-y-2">
                <p className="font-medium">Provider Details:</p>
                <p className="text-sm">
                  <strong>Name:</strong> {providerData?.name || "Unknown"}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {providerData?.email || "Unknown"}
                </p>
                <p className="text-sm">
                  <strong>Type:</strong>{" "}
                  {providerData?.providerType || "Unknown"}
                </p>
                <p className="text-sm">
                  <strong>Wallet:</strong> {walletAddress}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Once approved, you'll be able to create and manage courses.
              </p>
              <DangerZoneCloseProvider
                onClose={() => {
                  setProviderData(null);
                  window.location.reload();
                }}
              />
              {process.env.NODE_ENV === "development" && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  <p className="font-mono">Debug Info:</p>
                  <p className="font-mono">
                    Hub accepted providers:{" "}
                    {hubData?.acceptedProviders?.length || 0}
                  </p>
                  {hubData?.acceptedProviders?.map((p: Address, i: number) => (
                    <p key={i} className="font-mono text-xs">
                      {i}: {typeof p === "string" ? p : String(p)}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Provider Courses */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Courses</CardTitle>
                  <CardDescription>
                    Courses created and maintained by your provider account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {providerCourseEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      You have not created any courses yet. Use the Create
                      Course action to deploy your first credential experience.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {providerCourseEntries.map(({ course, address }) => (
                        <div
                          key={String(address)}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold">
                                {course.name ||
                                  String(address).slice(0, 8) + "…"}
                              </h3>
                              {getStatusBadge(course.status as CourseStatus)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Created {formatCourseTimestamp(course.created)}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {course.description || "No description provided."}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Modules
                              </p>
                              <p className="font-semibold">
                                {course.modules?.length ?? 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Approved Credentials
                              </p>
                              <p className="font-semibold">
                                {course.approvedCredentials?.length ?? 0}
                              </p>
                            </div>
                          </div>
                          {course.status === CourseStatus.Draft && (
                            <div className="mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  isSending ||
                                  submittingForReview === String(address)
                                }
                                onClick={() =>
                                  handleSubmitForHubReview(String(address))
                                }
                              >
                                {submittingForReview === String(address) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Submit for Hub Review
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      <Link href="/courses">
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                        >
                          Manage All Courses
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credentials (Endorsed → Approve) */}
              <Card>
                <CardHeader>
                  <CardTitle>Credentials</CardTitle>
                  <CardDescription>
                    Endorsed credentials awaiting your approval to add to course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {credentialsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading credentials…
                    </div>
                  ) : endorsedCredentials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No endorsed credentials. Students create credentials;
                      mentors endorse; you approve here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {endorsedCredentials.map(
                        ({ credential, address: credAddr }) => (
                          <div
                            key={credAddr}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">
                                {credential.metadata?.title ?? "Credential"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Student:{" "}
                                {String(credential.studentWallet).slice(0, 8)}…
                              </p>
                            </div>
                            <Button
                              size="sm"
                              disabled={
                                isSending || approvingCredential === credAddr
                              }
                              onClick={() =>
                                handleApproveCredential(
                                  credAddr,
                                  String(credential.course)
                                )
                              }
                            >
                              {approvingCredential === credAddr ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  <Link href="/create-credential" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      Create Credential
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/courses/create">
                    <Button className="w-full h-20 flex flex-col gap-2">
                      <Plus className="h-6 w-6" />
                      Create Course
                    </Button>
                  </Link>
                  <Link href="/courses">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col gap-2 bg-transparent"
                    >
                      <FileText className="h-6 w-6" />
                      Manage Courses
                    </Button>
                  </Link>
                  <Link href="/create-credential">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col gap-2 bg-transparent"
                    >
                      <Eye className="h-6 w-6" />
                      Create Credential
                    </Button>
                  </Link>
                  {isHubAuthority && (
                    <Link href="/hub">
                      <Button
                        variant="outline"
                        className="w-full h-20 flex flex-col gap-2 bg-transparent"
                      >
                        <Settings className="h-6 w-6" />
                        Hub Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Danger zone: Close account at bottom, collapsed */}
            <DangerZoneCloseProvider
              onClose={() => {
                setProviderData(null);
                window.location.reload();
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}

function DangerZoneCloseProvider({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-8 border border-destructive/30 rounded-lg overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          <span>Danger zone</span>
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-destructive/30 p-4 space-y-4 bg-muted/30">
          <CloseProviderCard onClose={onClose} />
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Re-initialize Provider
              </CardTitle>
              <CardDescription>
                To re-initialize, close the provider account first using the
                button above, then register again from the registration form.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatCourseTimestamp(value: bigint | number) {
  const date = new Date(Number(value) * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
