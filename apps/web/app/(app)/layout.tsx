import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { PackStatus } from "@wikideck/shared";
import { NotificationListener } from "@/components/notification-listener";
import { PackWatcher } from "@/components/pack-watcher";
import { BugReportButton } from "@/components/bug-report";
import { LegalLinks } from "@/components/legal/legal-links";
import { Navbar } from "@/components/navbar";
import { appMessages } from "@/i18n/client-messages";
import { API_URL, apiGet, getCurrentUser } from "@/lib/api";
import { SettingsProvider } from "@/lib/settings-context";

// l'espace connecté n'a rien à faire dans un moteur de recherche
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const [packs, messages, tNav] = await Promise.all([
    apiGet<PackStatus>("/packs"),
    appMessages({ staff: !!user.staff }),
    getTranslations("nav"),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <SettingsProvider initial={user.settings} apiUrl={API_URL}>
        <div className="flex min-h-screen flex-col">
          <Navbar user={user} logoutUrl={`${API_URL}/auth/logout`} packs={packs} />
          <main className="min-w-0 flex-1 overflow-x-clip p-4 sm:p-6 md:p-8">{children}</main>
          <footer className="mt-12 border-t border-line">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-3 px-6 py-5 text-xs text-fog md:flex-row md:justify-between">
              <p>{tNav("copyright", { year: new Date().getFullYear() })}</p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                <LegalLinks className="gap-x-5" />
                <BugReportButton apiUrl={API_URL} />
              </div>
            </div>
          </footer>
        </div>
        <PackWatcher initial={packs} apiUrl={API_URL} />
        <NotificationListener live={user.live} dailyBonus={user.dailyBonus} />
      </SettingsProvider>
    </NextIntlClientProvider>
  );
}
