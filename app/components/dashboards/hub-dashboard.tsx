"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileText,
  Award,
  Shield,
  Activity,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsHubAuthority } from "@/hooks/use-is-hub-authority";
import { HubSettingsDialog } from "@/components/hub/hub-settings-dialog";
import { AddEntityDialog } from "@/components/hub/add-entity-dialog";
import { BatchOperationsPanel } from "@/components/hub/batch-operations-panel";
import { useAppKitAccount } from "@reown/appkit/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBatchRegistry } from "@/hooks/use-batch-registry";
import { canonicalAddress } from "@/lib/utils/canonical-address";
import { InitializeHubCard } from "@/components/hub/initialize-hub-card";
import type { Address } from "@solana/kit";

export function HubDashboard() {
  const { toast } = useToast();
  const { address: walletAddress } = useAppKitAccount();
  const { isHubAuthority, loading, hubData, refreshHubData } =
    useIsHubAuthority();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("providers");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const batchRegistry = useBatchRegistry();

  const handleRemoveEntity = (
    entityType: "provider" | "course",
    entityKey: string,
    entityName?: string,
  ) => {
    if (!isHubAuthority) return;

    batchRegistry.addOperation("remove", entityType, entityKey, entityName);

    toast({
      title: "Operation Queued",
      description: `${entityType} removal added to batch operations.`,
    });
  };

  const handleAddEntityToBatch = (
    entityType: "provider" | "course",
    entityKey: string,
    entityName?: string,
    providerWallet?: string,
  ) => {
    if (!isHubAuthority) return;

    batchRegistry.addOperation(
      "add",
      entityType,
      entityKey,
      entityName,
      providerWallet,
    );

    toast({
      title: "Operation Queued",
      description: `${entityType} addition added to batch operations.`,
    });
  };

  const stats = [
    {
      title: "Accepted Providers",
      value: hubData?.acceptedProviders?.length || 0,
      icon: Users,
      color: "text-blue-600",
      description: "Educational organizations",
    },
    {
      title: "Accepted Courses",
      value: hubData?.acceptedCourses?.length || 0,
      icon: FileText,
      color: "text-green-600",
      description: "Hub-accepted; available for credentials",
    },
    {
      title: "System Status",
      value: "Active",
      icon: Activity,
      color: "text-yellow-600",
      description: "Hub operational",
    },
  ];

  const filterData = (data: (Address | string)[], term: string) => {
    if (!term) return data;
    return data.filter((item) =>
      String(item).toLowerCase().includes(term.toLowerCase()),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  /* Hub not created yet: show Initialize Hub (re-init) option */
  if (!hubData) {
    return <InitializeHubCard onSuccess={refreshHubData} />;
  }

  /* Non–hub authority: only show the info card + prompt that only admin can see the full page */
  if (!isHubAuthority) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only Hub administrators can view the full page. You are seeing a
            limited view.
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Authority & Wallet</CardTitle>
            <CardDescription>
              Hub authority (on-chain) vs connected wallet — must match to
              manage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-muted-foreground">Hub authority:</span>
              <span className="break-all">
                {canonicalAddress(hubData?.authority) ?? "—"}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-muted-foreground">Connected wallet:</span>
              <span className="break-all">
                {canonicalAddress(walletAddress) ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="secondary">Read-only</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batch Operations Panel */}
      {batchRegistry.hasPendingOperations && (
        <BatchOperationsPanel
          batchRegistry={batchRegistry}
          onBatchComplete={refreshHubData}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Hub Management</h2>
          <p className="text-muted-foreground">
            Central control for FairCredit platform curation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshHubData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Hub Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hub Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Hub Configuration</CardTitle>
          <CardDescription>
            Current hub settings and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Provider Requirements</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Minimum 2 endorsements required</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Auto-approval enabled</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Course Requirements</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Provider must be accepted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Manual review required</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registry Management</CardTitle>
              <CardDescription>
                Manage accepted entities in the FairCredit ecosystem
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Button size="sm" onClick={() => setAddEntityOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="providers">
                Providers ({hubData?.acceptedProviders?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="courses">
                Courses ({hubData?.acceptedCourses?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="providers" className="space-y-4">
              <div className="space-y-2">
                {filterData(hubData?.acceptedProviders || [], searchTerm).map(
                  (provider, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Provider #{index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            {provider.toString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Active</Badge>
                        {isHubAuthority && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveEntity(
                                "provider",
                                provider.toString(),
                                `Provider #${index + 1}`,
                              )
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ),
                )}
                {(!hubData?.acceptedProviders ||
                  hubData.acceptedProviders.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No accepted providers yet
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-4">
              <div className="space-y-2">
                {filterData(hubData?.acceptedCourses || [], searchTerm).map(
                  (course, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Course ID</p>
                          <p className="text-xs text-muted-foreground">
                            {course.toString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Active</Badge>
                        {isHubAuthority && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRemoveEntity(
                                "course",
                                course.toString(),
                                course.toString(),
                              )
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ),
                )}
                {(!hubData?.acceptedCourses ||
                  hubData.acceptedCourses.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No accepted courses yet
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions in the hub</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New provider added</p>
                <p className="text-xs text-muted-foreground">
                  Scholar Bridge Initiative joined • 2 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Course approved</p>
                <p className="text-xs text-muted-foreground">
                  Advanced Quantum Computing Research • 5 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Award className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New endorser verified</p>
                <p className="text-xs text-muted-foreground">
                  Dr. Sarah Chen added as endorser • 1 day ago
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <HubSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hubData={hubData}
        onUpdate={refreshHubData}
      />

      <AddEntityDialog
        open={addEntityOpen}
        onOpenChange={setAddEntityOpen}
        onSuccess={refreshHubData}
        onAddToBatch={(entityType, entityKey, entityName, providerWallet) =>
          handleAddEntityToBatch(
            entityType as "provider" | "course",
            entityKey,
            entityName,
            providerWallet,
          )
        }
      />
    </div>
  );
}
