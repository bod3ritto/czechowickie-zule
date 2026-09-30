import { isSupabaseConfigured } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/admin";
import { countSubmissions, getNetwork, getSearchIndex, listLocations } from "@/lib/queries/admin";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { SetupNotice } from "@/components/admin/setup-notice";

/** Admin pages are per-user and must never be cached or prerendered. */
export const dynamic = "force-dynamic";

/**
 * Every /admin page (except login) renders inside this layout, which
 * verifies the admin role on the server before anything is fetched.
 */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  // The proxy already sent anonymous visitors to /admin/login?next=…; this
  // catches signed-in users who are not admins (and anyone bypassing the proxy).
  const admin = await requireAdmin();
  const [network, locations, searchIndex, pendingSubmissions] = await Promise.all([
    getNetwork(),
    listLocations(),
    getSearchIndex(),
    countSubmissions(),
  ]);

  return (
    <AdminShell
      network={network}
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      searchIndex={searchIndex}
      adminEmail={admin.email}
      role={admin.role}
      pendingSubmissions={pendingSubmissions}
    >
      {children}
    </AdminShell>
  );
}
