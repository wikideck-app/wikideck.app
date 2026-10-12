import { notFound } from "next/navigation";
import { StaffView } from "@/components/staff/staff-view";
import { API_URL, getCurrentUser } from "@/lib/api";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("staff");

export default async function StaffPage() {
  const me = await getCurrentUser();
  if (!me?.staff) notFound();
  return (
    <div className="mx-auto max-w-[1500px]">
      <StaffView apiUrl={API_URL} role={me.staff} meId={me.id} meName={me.username} />
    </div>
  );
}
