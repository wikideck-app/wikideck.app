import { getTranslations } from "next-intl/server";
import {
  MARKET_FEE_PERCENT,
  PACK_MAX,
  PACK_REGEN_MS,
  PACK_SIZE,
  WIKIBITS_START,
} from "@wikideck/shared";
import { Fill, LegalHeader, Section, legalTags } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("terms", { path: "/terms" });

export default async function TermsPage() {
  const t = await getTranslations("terms");
  const email = { ...legalTags, fill: () => <Fill value={LEGAL.publisher.email} /> };
  return (
    <>
      <LegalHeader title={t("title")} intro={t("intro")} />

      <Section title={t("purpose.title")}>
        <p>{t("purpose.text")}</p>
      </Section>

      <Section title={t("account.title")}>
        <ul>
          <li>{t.rich("account.age", legalTags)}</li>
          <li>{t("account.personal")}</li>
          <li>{t("account.names")}</li>
          <li>{t.rich("account.delete", legalTags)}</li>
        </ul>
      </Section>

      <Section title={t("rules.title")}>
        <ul>
          <li>
            {t("rules.packs", {
              max: PACK_MAX,
              size: PACK_SIZE,
              minutes: PACK_REGEN_MS / 60_000,
            })}
          </li>
          <li>{t("rules.wikibits", { start: WIKIBITS_START })}</li>
          <li>{t("rules.changes")}</li>
        </ul>
      </Section>

      <Section title={t("value.title")}>
        <p>{t.rich("value.text", legalTags)}</p>
      </Section>

      <Section title={t("trading.title")}>
        <ul>
          <li>{t.rich("trading.final", legalTags)}</li>
          <li>{t("trading.bids")}</li>
          <li>{t("trading.fee", { fee: MARKET_FEE_PERCENT })}</li>
          <li>{t("trading.abuse")}</li>
        </ul>
      </Section>

      <Section title={t("conduct.title")}>
        <p>{t("conduct.intro")}</p>
        <ul>
          <li>{t("conduct.harass")}</li>
          <li>{t("conduct.illegal")}</li>
          <li>{t("conduct.bots")}</li>
          <li>{t("conduct.multi")}</li>
          <li>{t("conduct.access")}</li>
        </ul>
      </Section>

      <Section title={t("wikipedia.title")}>
        <p>{t.rich("wikipedia.text", legalTags)}</p>
      </Section>

      <Section title={t("sanctions.title")}>
        <p>{t("sanctions.text")}</p>
      </Section>

      <Section title={t("liability.title")}>
        <p>{t.rich("liability.text", legalTags)}</p>
      </Section>

      <Section title={t("ip.title")}>
        <p>{t("ip.text")}</p>
      </Section>

      <Section title={t("updates.title")}>
        <p>{t("updates.text")}</p>
      </Section>

      <Section title={t("law.title")}>
        <p>{t.rich("law.text", email)}</p>
      </Section>
    </>
  );
}
