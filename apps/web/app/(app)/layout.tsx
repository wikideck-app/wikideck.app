import { redirect } from "next/navigation";
import type { PackStatus } from "@wikideck/shared";
import { NotificationListener } from "@/components/notification-listener";
import { PackWatcher } from "@/components/pack-watcher";
import { BugReportButton } from "@/components/bug-report";
import { LegalLinks } from "@/components/legal/legal-links";
import { Navbar } from "@/components/navbar";
import { API_URL, apiGet, getCurrentUser } from "@/lib/api";
import { SettingsProvider } from "@/lib/settings-context";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const packs = await apiGet<PackStatus>("/packs");

  return (
    <SettingsProvider initial={user.settings} apiUrl={API_URL}>
      <div className="flex min-h-screen flex-col">
        <Navbar user={user} logoutUrl={`${API_URL}/auth/logout`} packs={packs} />
        <main className="min-w-0 flex-1 overflow-x-clip p-4 sm:p-6 md:p-8">{children}</main>
        <footer className="px-6 pb-8 pt-4 text-center text-xs text-fog">
          <LegalLinks className="justify-center" />
          <BugReportButton apiUrl={API_URL} className="mt-1" />
        </footer>
      </div>
      <PackWatcher initial={packs} apiUrl={API_URL} />
      <NotificationListener live={user.live} />
    </SettingsProvider>
  );
}
