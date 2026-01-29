"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";
// Ensure AppKit is initialized before any useAppKit/useAppKitAccount (e.g. NavbarActions)
import "@/components/wallet-provider";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
