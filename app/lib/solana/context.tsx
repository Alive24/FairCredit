"use client";

import React, { createContext, useContext } from "react";

interface FairCreditContextType {
  rpcUrl: string;
}

const FairCreditContext = createContext<FairCreditContextType>({
  rpcUrl: "",
});

export function FairCreditProvider({
  children,
  rpcUrl,
}: {
  children: React.ReactNode;
  rpcUrl: string;
}) {
  return (
    <FairCreditContext.Provider value={{ rpcUrl }}>
      {children}
    </FairCreditContext.Provider>
  );
}

export function useFairCredit() {
  const context = useContext(FairCreditContext);
  if (!context) {
    throw new Error("useFairCredit must be used within a FairCreditProvider");
  }
  return context;
}
