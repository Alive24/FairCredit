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
            <TransactionQueueProvider>
              <Layout
                navbar={navbar}
                footer={footer}
                pageMap={pageMap}
                docsRepositoryBase="https://github.com/Alive24/FairCredit/tree/main/app/content"
              >
                <ClientLayout>{children}</ClientLayout>
              </Layout>
            </TransactionQueueProvider>
            <Toaster />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
