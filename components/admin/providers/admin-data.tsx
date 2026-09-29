"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Network, NetworkPerson } from "@/lib/admin/network";
import type { SearchItem } from "@/lib/queries/admin";

export interface LocationOption {
  id: string;
  name: string;
}

interface AdminData {
  network: Network;
  peopleById: Map<string, NetworkPerson>;
  locations: LocationOption[];
  searchIndex: SearchItem[];
  adminEmail: string;
}

const AdminDataContext = createContext<AdminData | null>(null);

/**
 * Network-wide data loaded once by the admin layout (and reloaded by
 * router.refresh() after every mutation): pickers, previews, duplicate
 * checks and search all read from here instead of fetching again.
 */
export function AdminDataProvider({
  network,
  locations,
  searchIndex,
  adminEmail,
  children,
}: Omit<AdminData, "peopleById"> & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      network,
      locations,
      searchIndex,
      adminEmail,
      peopleById: new Map(network.people.map((p) => [p.id, p])),
    }),
    [network, locations, searchIndex, adminEmail],
  );
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used inside the admin layout");
  return ctx;
}
