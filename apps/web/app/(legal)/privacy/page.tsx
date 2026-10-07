import { getTranslations } from "next-intl/server";
import { Fill, LegalHeader, Section, legalTags } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("privacy");

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const { publisher } = LEGAL;
  const email = { ...legalTags, fill: () => <Fill value={publisher.email} /> };
  const host = { ...legalTags, fill: () => <Fill value={LEGAL.host.name} /> };
  return (
    <>
      <LegalHeader title={t("title")} intro={t("intro")} />

      <Section title={t("controller.title")}>
        <p>{t.rich("controller.text", { ...email, name: publisher.name })}</p>
      </Section>

      <Section title={t("collected.title")}>
        <p>{t("collected.intro")}</p>
        <ul>
          <li>{t.rich("collected.discord", legalTags)}</li>
          <li>{t.rich("collected.game", legalTags)}</li>
          <li>{t.rich("collected.security", legalTags)}</li>
          <li>{t.rich("collected.report", legalTags)}</li>
          <li>{t.rich("collected.messages", legalTags)}</li>
          <li>{t.rich("collected.technical", legalTags)}</li>
          <li>{t.rich("collected.live", legalTags)}</li>
        </ul>
        <p>{t("collected.outro")}</p>
      </Section>

      <Section title={t("cookies.title")}>
        <p>{t("cookies.intro")}</p>
        <ul>
          <li>{t.rich("cookies.session", legalTags)}</li>
          <li>{t.rich("cookies.oauth", legalTags)}</li>
          <li>{t.rich("cookies.storage", legalTags)}</li>
        </ul>
        <p>{t("cookies.outro")}</p>
      </Section>

      <Section title={t("recipients.title")}>
        <ul>
          <li>{t.rich("recipients.players", legalTags)}</li>
          <li>{t.rich("recipients.publisher", host)}</li>
          <li>{t.rich("recipients.third", legalTags)}</li>
        </ul>
        <p>{t("recipients.transfer")}</p>
      </Section>

      <Section title={t("retention.title")}>
        <ul>
          <li>{t.rich("retention.account", legalTags)}</li>
          <li>{t.rich("retention.session", legalTags)}</li>
          <li>{t.rich("retention.counters", legalTags)}</li>
          <li>{t.rich("retention.logs", legalTags)}</li>
        </ul>
        <p>{t("retention.outro")}</p>
      </Section>

      <Section title={t("rights.title")}>
        <p>{t.rich("rights.intro", legalTags)}</p>
        <ul>
          <li>{t.rich("rights.export", legalTags)}</li>
          <li>{t("rights.profile")}</li>
          <li>{t.rich("rights.delete", legalTags)}</li>
        </ul>
        <p>{t.rich("rights.outro", email)}</p>
      </Section>

      <Section title={t("minors.title")}>
        <p>{t.rich("minors.text", legalTags)}</p>
      </Section>

      <Section title={t("security.title")}>
        <p>{t("security.text")}</p>
      </Section>

      <Section title={t("changes.title")}>
        <p>{t("changes.text")}</p>
      </Section>
    </>
  );
}
