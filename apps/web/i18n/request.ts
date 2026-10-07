import { getRequestConfig } from "next-intl/server";
import { defaultLocale, timeZone } from "./config";
import { formats } from "./formats";

// une seule langue pour l'instant ; une future langue se résout ici (cookie, en-tête, profil...)
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone,
    formats,
    messages: (await import(`../messages/${locale}/index.ts`)).default,
  };
});
