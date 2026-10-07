import type { formats } from "@/i18n/formats";
import type { Locale } from "@/i18n/config";
import type messages from "@/messages/fr";

// typage des clés : t("collecton.title") ne compile pas
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
