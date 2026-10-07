import { notFound } from "next/navigation";
import { ApiReference } from "@/components/docs/api-reference";
import { getCurrentUser } from "@/lib/api";
import { STAFF_DOCS } from "@/lib/api-docs";

export const metadata = { title: "API staff — Wikideck", robots: { index: false } };

const code = "rounded bg-foreground/10 px-1.5 py-0.5 text-xs";

export default async function StaffDocsPage() {
  const me = await getCurrentUser();
  if (!me?.staff) notFound();
  return (
    <>
      <h1 className="font-display text-5xl font-medium">API staff</h1>
      <p className="prose-serif mt-3 text-pale-mist">
        Routes de l&apos;espace staff, sous <code className={code}>/staff</code>. Même session et
        mêmes conventions que l&apos;API des joueurs.
      </p>
      <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-pale-mist">
        <p>
          <strong className="text-foreground">Accès</strong> : compte staff, rôle modérateur ou
          administrateur. Un compte sans rôle reçoit <code className={code}>404</code>.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Journal</strong> : chaque action qui modifie quelque
          chose est enregistrée avec son auteur, sa cible et son motif, et visible dans{" "}
          <code className={code}>/staff/audit</code>.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Rôles</strong> : le modérateur peut bannir, renommer
          et ajuster la confiance d&apos;un membre de rang inférieur. Donner des wikibits ou des
          paquets, changer un rôle et supprimer un compte demandent le rôle administrateur. Tu ne
          peux jamais agir sur toi-même ni sur un administrateur défini par la configuration du
          serveur.
        </p>
      </div>
      <ApiReference sections={STAFF_DOCS} />
    </>
  );
}
