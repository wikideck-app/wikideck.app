import { notFound } from "next/navigation";
import { StaffView } from "@/components/staff/staff-view";
import { API_URL, getCurrentUser } from "@/lib/api";

export const metadata = { title: "Staff — Wikideck" };

export default async function StaffPage() {
  const me = await getCurrentUser();
  if (!me?.staff) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-center font-display text-5xl font-medium">Staff</h1>
      <p className="prose-serif mt-2 text-center text-pale-mist">
        Gestion du site et des membres. Toute action est consignée dans le journal.
      </p>
      <StaffView apiUrl={API_URL} role={me.staff} meId={me.id} />
    </div>
  );
}
