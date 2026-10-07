import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const alt = "Wikideck";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const t = await getTranslations("meta");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 90,
          color: "white",
          background: "linear-gradient(135deg, #3f0791, #1b0340)",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700 }}>{t("siteName")}</div>
        <div style={{ marginTop: 24, fontSize: 48, opacity: 0.85 }}>{t("tagline")}</div>
      </div>
    ),
    size,
  );
}
