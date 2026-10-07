import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Atkinson_Hyperlegible, Newsreader, Outfit } from "next/font/google";
import { THEME_STORAGE_KEY } from "@wikideck/shared";
import { ApiErrorMessages } from "@/components/api-error-messages";
import { SITE_URL } from "@/lib/site";
import { localeDirection } from "@/i18n/config";
import { landingMessages } from "@/i18n/client-messages";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400"],
});

const readable = Atkinson_Hyperlegible({
  variable: "--font-readable",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("meta"), getLocale()]);
  const { language, region } = new Intl.Locale(locale).maximize();
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: t("siteName"),
    title: { default: t("homeTitle"), template: t("titleTemplate") },
    description: t("description"),
    category: t("category"),
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: "/",
      siteName: t("siteName"),
      title: t("homeTitle"),
      description: t("description"),
      // fr -> fr_FR : le format Open Graph est langue_PAYS
      locale: `${language}_${region}`,
    },
    twitter: { card: "summary_large_image", title: t("homeTitle"), description: t("description") },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, messages] = await Promise.all([getLocale(), landingMessages()]);

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      suppressHydrationWarning
      className={`${outfit.variable} ${readable.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ApiErrorMessages />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
