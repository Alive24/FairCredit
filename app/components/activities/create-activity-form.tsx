"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAppKitAccount } from "@reown/appkit/react";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { fetchMaybeCourse } from "@/lib/solana/generated/accounts/course";
import { getCreateActivityInstructionAsync } from "@/lib/solana/generated/instructions/createActivity";
import { ActivityKind } from "@/lib/solana/generated/types/activityKind";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { Loader2, Send } from "lucide-react";
import { address as toAddress } from "@solana/kit";

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  evidenceLink: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  moduleId: z.string().optional(),
});

export function CreateActivityForm({
  courseAddress,
}: {
  courseAddress: string;
}) {
  const { address, isConnected } = useAppKitAccount();
  const { sendTransaction } = useAppKitTransaction();
  const { rpc } = useFairCredit();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [course, setCourse] = useState<any>(null); // Using any for now, better to use proper Course type

  // Fetch course details on mount to get modules
  useState(() => {
    fetchMaybeCourse(rpc, toAddress(courseAddress))
      .then((res) => {
        if (res.exists) {
          setCourse(res.data);
        }
      })
      .catch((err) => console.error("Failed to fetch course:", err));
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      evidenceLink: "",
      moduleId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!address || !isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to submit an activity.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const coursePubkey = toAddress(courseAddress);

      // We already fetched course above, but let's fetch again for safety or just use the address directly
      // Note: provider is needed for PDA seed.
      const courseAccount = await fetchMaybeCourse(rpc, coursePubkey);
      if (!courseAccount.exists) {
        throw new Error("Course not found");
      }

      const providerPubkey = courseAccount.data.provider; // This is an Address type

      // Prepare data JSON
      const activityData = JSON.stringify({
        title: values.title,
        description: values.description,
        evidenceLink: values.evidenceLink,
        modules: values.moduleId ? [{ moduleId: values.moduleId }] : [],
      });

      // Create instruction
      const ix = await getCreateActivityInstructionAsync({
        activity: undefined, // Auto-derived
        student: createPlaceholderSigner(address),
        provider: providerPubkey,
        hub: undefined, // Auto-derived
        systemProgram: undefined,
        creationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        kind: ActivityKind.SubmitAssignment,
        data: activityData,
        degreeId: null,
        course: coursePubkey,
        resourceId: null,
        resourceKind: null,
      });

      await sendTransaction([ix]);

      toast({
        title: "Activity Submitted",
        description: "Your activity has been logged successfully.",
      });

      form.reset();
      window.location.reload();
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Completed Week 1 Assignment"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what you did..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="moduleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Related Module (Optional)</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                >
                  <option key="__placeholder" value="">
                    Select a module...
                  </option>
                  {course?.modules?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="evidenceLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evidence Link (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Activity
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
