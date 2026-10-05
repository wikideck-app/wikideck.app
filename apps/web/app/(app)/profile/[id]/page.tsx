import { notFound } from "next/navigation";
import type { ProfileDto } from "@wikideck/shared";
import { ProfileView } from "@/components/profile/profile-view";
import { API_URL, apiGet } from "@/lib/api";

export const metadata = { title: "Profil — Wikideck" };

export default async function ProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const profile = await apiGet<ProfileDto>(`/players/${encodeURIComponent(id)}/profile`);
  if (!profile) notFound();
  return <ProfileView profile={profile} apiUrl={API_URL} />;
}
