import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api";

export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  redirect(`/profile/${user.id}`);
}
