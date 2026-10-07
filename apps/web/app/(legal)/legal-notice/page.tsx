import { getTranslations } from "next-intl/server";
import { Fill, LegalHeader, Section, legalTags } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("legalNotice", { path: "/legal-notice" });

export default async function LegalNoticePage() {
  const t = await getTranslations("legalNotice");
  const { publisher, host } = LEGAL;
  const tags = legalTags;
  const email = { ...tags, fill: () => <Fill value={publisher.email} /> };
  return (
    <>
      <LegalHeader title={t("title")} intro={t("intro")} />

      <Section title={t("publisher.title")}>
        <p>
          {t.rich("publisher.intro", {
            ...tags,
            siteName: LEGAL.siteName,
            siteUrl: LEGAL.siteUrl,
          })}
        </p>
        <ul>
          <li>{t.rich("publisher.name", { ...tags, value: publisher.name })}</li>
          <li>
            {t.rich("publisher.status", {
              ...tags,
              value: t(`publisher.statuses.${publisher.status}`),
            })}
          </li>
          <li>
            {t.rich("publisher.address", { ...tags, fill: () => <Fill value={publisher.address} /> })}
          </li>
          <li>{t.rich("publisher.contact", email)}</li>
        </ul>
        <p>{t.rich("publisher.director", { ...tags, name: publisher.director })}</p>
      </Section>

      <Section title={t("host.title")}>
        <ul>
          <li>{t.rich("host.name", { ...tags, fill: () => <Fill value={host.name} /> })}</li>
          <li>{t.rich("host.address", { ...tags, fill: () => <Fill value={host.address} /> })}</li>
          <li>{t.rich("host.phone", { ...tags, fill: () => <Fill value={host.phone} /> })}</li>
          <li>
            {t.rich("host.site", tags)}
            <a href={host.website} target="_blank" rel="noreferrer">
              {host.website.replace("https://", "")}
            </a>
          </li>
        </ul>
      </Section>

      <Section title={t("ip.title")}>
        <p>{t("ip.own")}</p>
        <p>{t.rich("ip.content", tags)}</p>
        <p>{t.rich("ip.images", tags)}</p>
        <p>{t.rich("ip.trademarks", tags)}</p>
      </Section>

      <Section title={t("data.title")}>
        <p>{t.rich("data.text", tags)}</p>
      </Section>

      <Section title={t("report.title")}>
        <p>{t.rich("report.text", email)}</p>
      </Section>

      <Section title={t("liability.title")}>
        <p>{t("liability.text")}</p>
      </Section>
    </>
  );
}
