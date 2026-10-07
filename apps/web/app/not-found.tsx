import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/settings/controls";

export async function generateMetadata() {
  const t = await getTranslations("meta.pages");
  return { title: t("notFound") };
}

export default async function NotFound() {
  const t = await getTranslations("common.notFound");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-display text-8xl font-medium text-accent">404</p>
      <h1 className="font-display text-3xl font-medium">{t("title")}</h1>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass}>
          {t("home")}
        </Link>
        <Link href="/cards" className={buttonClass}>
          {t("browse")}
        </Link>
      </div>
    </main>
  );
}
