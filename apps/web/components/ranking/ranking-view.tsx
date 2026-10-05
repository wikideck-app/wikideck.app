import Link from "next/link";
import {
  RANKING_BOARDS,
  type PlayerRankEntry,
  type PlayerRankingResponse,
  type RankingBoard,
} from "@wikideck/shared";

const num = new Intl.NumberFormat("fr-FR");
const MEDAL = ["🥇", "🥈", "🥉"];

function Row({ entry, unit }: { entry: PlayerRankEntry; unit: string }) {
  return (
    <li>
      <Link
        href={`/profile/${entry.id}`}
        className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/5 ${
          entry.isMe ? "bg-accent/10" : ""
        }`}
      >
        <span className="w-10 shrink-0 text-center font-bold tabular-nums">
          {entry.rank <= 3 ? MEDAL[entry.rank - 1] : entry.rank}
        </span>
        {entry.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.avatarUrl} alt="" className="size-8 shrink-0 rounded-full" />
        ) : (
          <span className="size-8 shrink-0 rounded-full bg-foreground/10" />
        )}
        <span className="min-w-0 flex-1 truncate font-semibold">
          {entry.username}
          {entry.isMe && <span className="ml-2 text-xs font-normal text-fog">vous</span>}
        </span>
        <span className="tabular-nums">
          <strong>{num.format(entry.score)}</strong>{" "}
          <span className="text-sm text-fog">{unit}</span>
        </span>
      </Link>
    </li>
  );
}

export function RankingView({
  board,
  data,
}: {
  board: RankingBoard;
  data: PlayerRankingResponse | null;
}) {
  const info = RANKING_BOARDS.find((b) => b.value === board)!;
  return (
    <>
      <nav aria-label="Classements" className="mt-6 flex flex-wrap justify-center gap-2">
        {RANKING_BOARDS.map((b) => (
          <Link
            key={b.value}
            href={`/ranking?board=${b.value}`}
            aria-current={b.value === board ? "page" : undefined}
            className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-foreground/10 aria-[current=page]:border-accent aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
          >
            {b.label}
          </Link>
        ))}
        <Link
          href="/guild"
          className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-foreground/10"
        >
          Guildes
        </Link>
      </nav>
      <p className="mt-3 text-center text-sm text-pale-mist">{info.hint}.</p>

      {!data ? (
        <p className="mt-10 text-center text-sm text-danger">
          Impossible de charger le classement.
        </p>
      ) : data.entries.length === 0 && !data.mine ? (
        <p className="mt-10 text-center opacity-60">Personne dans ce classement pour le moment.</p>
      ) : (
        <>
          <ol className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.entries.map((e) => (
              <Row key={e.id} entry={e} unit={info.unit} />
            ))}
          </ol>
          {data.mine && (
            <div className="mt-3 overflow-hidden rounded-xl border border-accent/50 bg-surface">
              <Row entry={data.mine} unit={info.unit} />
            </div>
          )}
          {data.publicOnly && (
            <p className="mt-4 text-center text-xs text-fog">
              Seuls les joueurs dont la collection est publique apparaissent ici (réglable dans les
              paramètres).
            </p>
          )}
        </>
      )}
    </>
  );
}
