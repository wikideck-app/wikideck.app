import { Lock } from "@/components/icons";
import { getCurrentUser } from "@/lib/api";

export async function TrustNotice() {
  const user = await getCurrentUser();
  if (user?.trust.level !== "RESTRICTED") return null;

  return (
    <div
      role="status"
      className="mx-auto mt-5 flex max-w-2xl items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-left text-sm"
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="text-pale-mist">
        <strong className="text-foreground">Fonctions temporairement indisponibles.</strong> Les
        échanges, cadeaux, enchères et gains de la Bataille sont suspendus pour ce compte. Si
        c&apos;est une erreur, contactez l&apos;équipe du site.
      </p>
    </div>
  );
}
