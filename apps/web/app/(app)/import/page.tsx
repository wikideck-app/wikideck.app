import { ImportWizard } from "@/components/import-wizard";
import { API_URL } from "@/lib/api";

export const metadata = { title: "Importer ma collection — Wikideck" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="font-display text-5xl font-medium">Importer ma collection</h1>
      <p className="prose-serif mt-3 text-pale-mist">
        Retrouvez vos cartes de Wiki-Masters dans Wikideck.
      </p>
      <div className="text-left">
        <ImportWizard apiUrl={API_URL} />
      </div>
    </div>
  );
}
