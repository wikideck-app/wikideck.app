import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StaffView } from "@/components/staff/staff-view";
import { API_URL, getCurrentUser } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("staff");

export default async function StaffPage() {
  const [me, t] = await Promise.all([getCurrentUser(), getTranslations("staff")]);
  if (!me?.staff) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-center font-display text-5xl font-medium">{t("title")}</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        {t("subtitle")}
      </p>
      <StaffView apiUrl={API_URL} role={me.staff} meId={me.id} />
    </div>
  );
}
