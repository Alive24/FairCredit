import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GraduationCap } from "lucide-react";
import { Layout, Navbar, Footer } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import "./globals.css";
import "nextra-theme-docs/style.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ClientLayout } from "@/components/client-layout";
import { WalletProvider } from "@/components/wallet-provider";
import { NavbarActions } from "@/components/navbar-actions";
import { TransactionQueueProvider } from "@/hooks/use-transaction-queue";
import { UserRoleProvider } from "@/hooks/use-user-role";

const inter = Inter({ subsets: ["latin"] });

const navbar = (
  <Navbar
    logo={
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span
          style={{ marginLeft: ".5em", fontWeight: 800, fontSize: "1.25rem" }}
        >
          FairCredit
        </span>
      </div>
    }
    logoLink="/"
    projectLink="https://github.com/Alive24/FairCredit"
    align="left"
  >
    <NavbarActions />
  </Navbar>
);

const footer = <Footer>MIT {new Date().getFullYear()} © FairCredit.</Footer>;

export const metadata: Metadata = {
  title: "FairCredit - Blockchain Academic Credentials",
  description:
    "Revolutionizing verification of non-traditional higher education academic credentials",
  generator: "v0.dev",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageMap = await getPageMap();
  const filteredPageMap = withFallbackPageMap(
    filterDynamicRoutes(pageMap),
  ) as any;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>
            <UserRoleProvider>
              <TransactionQueueProvider>
                <Layout
                  navbar={navbar}
                  footer={footer}
                  pageMap={filteredPageMap}
                  docsRepositoryBase="https://github.com/Alive24/FairCredit/tree/main/app/content"
                >
                  <ClientLayout>{children}</ClientLayout>
                </Layout>
              </TransactionQueueProvider>
              <Toaster />
            </UserRoleProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function filterDynamicRoutes(input: unknown): unknown[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const route = typeof record.route === "string" ? record.route : null;
    if (route && route.includes("[")) {
      return [];
    }
    const next: Record<string, unknown> = { ...record };
    if (Array.isArray(record.children)) {
      const filteredChildren = filterDynamicRoutes(record.children);
      if (filteredChildren.length > 0) {
        next.children = filteredChildren;
      } else {
        // Avoid passing empty pageMap lists into nextra normalizePages (it assumes list[0] exists).
        delete next.children;
      }
    }
    if (Array.isArray(record.items)) {
      const filteredItems = filterDynamicRoutes(record.items);
      if (filteredItems.length > 0) {
        next.items = filteredItems;
      } else {
        delete next.items;
      }
    }
    return [next];
  });
}

function withFallbackPageMap(items: unknown[]): unknown[] {
  if (items.length > 0) return items;
  return [{ data: {} }];
}
