import { redirect } from "next/navigation";

// la documentation staff vit dans l'espace staff, séparée de la documentation publique
export default function StaffDocsRedirect() {
  redirect("/staff/docs");
}
