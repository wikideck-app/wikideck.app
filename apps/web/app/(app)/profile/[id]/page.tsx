import { notFound } from "next/navigation";
import type { ProfileDto, ReferralInfo } from "@wikideck/shared";
import { ProfileView } from "@/components/profile/profile-view";
import { API_URL, apiGet } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("profile");

export default async function ProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const profile = await apiGet<ProfileDto>(`/players/${encodeURIComponent(id)}/profile`);
  if (!profile) notFound();
  const referral = profile.isSelf ? await apiGet<ReferralInfo>("/me/referral") : null;
  return <ProfileView profile={profile} apiUrl={API_URL} referral={referral} siteUrl={SITE_URL} />;
}
