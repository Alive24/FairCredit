"use client";

import { useState, useEffect } from "react";
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
  TrendingUp,
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
import { ProviderRegistrationCard } from "@/components/provider/provider-registration-card";
import { CloseProviderCard } from "@/components/provider/close-provider-card";
import { WalletDebug } from "@/components/wallet-debug";
import { address } from "@solana/kit";
import type { Address } from "@solana/kit";
import {
  fetchMaybeHub,
  fetchMaybeProvider,
  fetchMaybeCourse,
} from "@/lib/solana/generated/accounts";
import type { Hub, Provider, Course } from "@/lib/solana/generated/accounts";
import { getUpdateHubConfigInstructionAsync } from "@/lib/solana/generated/instructions/updateHubConfig";
import { getAddAcceptedProviderInstructionAsync } from "@/lib/solana/generated/instructions/addAcceptedProvider";
import { getAddAcceptedCourseInstructionAsync } from "@/lib/solana/generated/instructions/addAcceptedCourse";
import { DEFAULT_PLACEHOLDER_SIGNER } from "@/lib/solana/placeholder-signer";

export function ProviderDashboard() {
  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected: connected } = useAppKitAccount();
  const publicKey = walletAddress ? address(walletAddress) : null;
  const isWalletConnected = connected;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [hubData, setHubData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!isWalletConnected || !publicKey || !walletAddress) {
        setLoading(false);
        return;
      }

      try {
        // Fetch hub data to check if provider is accepted
        // Get hub address from Codama instruction (it auto-resolves PDA)
        const hubInstruction = await getUpdateHubConfigInstructionAsync({
          hub: undefined,
          authority: DEFAULT_PLACEHOLDER_SIGNER,
          config: {
            requireProviderApproval: false,
            minReputationScore: 0,
          },
        });
        const hubAddress = hubInstruction.accounts[0].address;
        const hubAccount = await fetchMaybeHub(rpc, hubAddress);
        const hub = hubAccount.exists ? hubAccount.data : null;
        if (!hub) {
          setHubData(null);
          setLoading(false);
          return;
        }
        console.log("Hub data:", hub);
        console.log("Accepted providers:", hub?.acceptedProviders);
        console.log("Current wallet:", walletAddress);
        setHubData(hub);

        // First check if provider exists (not necessarily accepted)
        try {
          // Get provider address from Codama instruction (it auto-resolves PDA)
          const providerInstruction =
            await getAddAcceptedProviderInstructionAsync({
              hub: undefined,
              authority: DEFAULT_PLACEHOLDER_SIGNER,
              provider: undefined,
              providerWallet: address(walletAddress),
            });
          const providerAddress = providerInstruction.accounts[2].address;
          const providerAccount = await fetchMaybeProvider(
            rpc,
            providerAddress,
          );
          if (providerAccount.exists) {
            const providerInfo = providerAccount.data;
            console.log("Provider exists:", providerInfo);
            setProviderData(providerInfo);

            // Check if current wallet is an accepted provider
            const isAcceptedProvider =
              hub.acceptedProviders?.some((p) => {
                const providerAddress = typeof p === "string" ? p : String(p);
                return providerAddress === walletAddress;
              }) ?? false;
            console.log("Is accepted provider:", isAcceptedProvider);

            if (isAcceptedProvider) {
              const providerCourses: Course[] = [];
              for (const courseId of hub.acceptedCourses ?? []) {
                const ix = await getAddAcceptedCourseInstructionAsync({
                  hub: undefined,
                  authority: DEFAULT_PLACEHOLDER_SIGNER,
                  course: undefined,
                  courseId,
                  providerWallet: address(walletAddress),
                });
                const courseAddr = ix.accounts[3].address as Address;
                const acc = await fetchMaybeCourse(rpc, courseAddr);
                if (!acc.exists) continue;
                const data: Course = acc.data;
                const provKey: string =
                  typeof data.provider === "string"
                    ? data.provider
                    : String(data.provider);
                if (provKey === walletAddress) providerCourses.push(data);
              }
              setCourses(providerCourses);
            }
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
    }

    fetchData();
  }, [rpc, isWalletConnected, publicKey, walletAddress, toast]);

  const hasProviderAccount = !!providerData;
  const isAcceptedProvider = Boolean(
    hubData?.acceptedProviders?.some((p: Address) => {
      const providerAddress = typeof p === "string" ? p : String(p);
      return providerAddress === walletAddress;
    }),
  );

  // Calculate stats based on real data
  const stats = [
    {
      title: "Active Courses",
      value: courses.length.toString(),
      icon: FileText,
      color: "text-blue-600",
      change: "+12%",
    },
    {
      title: "Pending Applications",
      value: "12",
      icon: Clock,
      color: "text-yellow-600",
      change: "+5%",
    },
    {
      title: "Credentials Issued",
      value: providerData?.credentialsIssued || "0",
      icon: Award,
      color: "text-green-600",
      change: "+23%",
    },
    {
      title: "Total Students",
      value: providerData?.totalStudents || "0",
      icon: Users,
      color: "text-purple-600",
      change: "+18%",
    },
  ];

  const recentApplications = [
    {
      id: "1",
      studentName: "Alex Johnson",
      course: "Advanced Quantum Computing Research",
      submittedDate: "2024-01-20",
      status: "pending-review",
    },
    {
      id: "2",
      studentName: "Sarah Chen",
      course: "Machine Learning in Healthcare",
      submittedDate: "2024-01-19",
      status: "approved",
    },
    {
      id: "3",
      studentName: "Michael Roberts",
      course: "Sustainable Energy Systems",
      submittedDate: "2024-01-18",
      status: "pending-review",
    },
  ];

  const activeCourses = [
    {
      id: "1",
      title: "Advanced Quantum Computing Research",
      applications: 8,
      enrolled: 5,
      completions: 2,
      status: "active",
    },
    {
      id: "2",
      title: "Machine Learning in Healthcare",
      applications: 12,
      enrolled: 8,
      completions: 4,
      status: "active",
    },
    {
      id: "3",
      title: "Digital Innovation Workshop",
      applications: 6,
      enrolled: 4,
      completions: 3,
      status: "active",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending-review":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Approved
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Active
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

        {loading ? (
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
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                      {stat.change} from last month
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Applications */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>
                    Latest student applications requiring review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentApplications.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {application.studentName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {application.course}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {application.submittedDate}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(application.status)}
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Link href="/applications">
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                      >
                        View All Applications
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Active Courses */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Courses</CardTitle>
                  <CardDescription>
                    Your currently running credential courses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeCourses.map((course) => (
                      <div key={course.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{course.title}</h3>
                            {getStatusBadge(course.status)}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {course.applications}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Applications
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              {course.enrolled}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Enrolled
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-600">
                              {course.completions}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Completed
                            </div>
                          </div>
                        </div>
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
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Link href="/courses/create">
                    <Button className="w-full h-20 flex flex-col gap-2">
                      <Plus className="h-6 w-6" />
                      Create Course
                    </Button>
                  </Link>
                  <Link href="/applications">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col gap-2 bg-transparent"
                    >
                      <Clock className="h-6 w-6" />
                      Review Applications
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
                  <Link href="/analytics">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col gap-2 bg-transparent"
                    >
                      <Settings className="h-6 w-6" />
                      Analytics
                    </Button>
                  </Link>
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
