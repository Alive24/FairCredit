"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";

export type UserRole =
  | "provider"
  | "student"
  | "supervisor"
  | "verifier"
  | null;

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isLoading: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(
  undefined,
);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sync with localStorage on mount
    if (typeof window !== "undefined") {
      const savedRole = window.localStorage.getItem("userType") as UserRole;
      setRoleState(savedRole);
      setIsLoading(false);

      // Listen for storage events (multi-tab sync)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "userType") {
          setRoleState(e.newValue as UserRole);
        }
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      if (newRole) {
        window.localStorage.setItem("userType", newRole);
      } else {
        window.localStorage.removeItem("userType");
      }
      // Dispatch event for non-react listeners if any (legacy compatibility)
      window.dispatchEvent(new Event("faircredit:role-change"));
    }
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      isLoading,
    }),
    [role, isLoading],
  );

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
