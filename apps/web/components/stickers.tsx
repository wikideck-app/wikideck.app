// Décor de l'accueil : un ruban bleu gonflé et grumeleux qui s'enroule derrière le mot géant, des
// autocollants colorés (contour noir) posés de travers par-dessus. Purement décoratif.
const OUTLINE = { stroke: "#000", strokeWidth: 1.6, strokeLinejoin: "round" } as const;

// un seul tracé pour toutes les couches du ruban
const RIBBON = "M-150 220 C 150 -80, 520 120, 380 380 S 120 760, 520 700 S 1000 340, 1280 640 S 1500 380, 1700 520";

export function Ribbon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <defs>
        {/* grain : un bruit blanc découpé dans la forme, comme la surface rugueuse de la référence */}
        <filter id="ribbon-grain" filterUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.74"
            result="speckle"
          />
          <feComposite in="speckle" in2="SourceAlpha" operator="in" result="grain" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="grain" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#ribbon-grain)" fill="none" strokeLinecap="round">
        <path d={RIBBON} stroke="#2f7fe0" strokeWidth="250" />
        <path d={RIBBON} stroke="#4da2ff" strokeWidth="222" />
        <path d={RIBBON} stroke="#7dbcff" strokeWidth="64" transform="translate(-26 -34)" opacity="0.85" />
      </g>
    </svg>
  );
}

function Sticker({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute z-10 overflow-visible ${className}`}
    >
      {children}
    </svg>
  );
}

export function Stickers() {
  return (
    <>
      {/* fusée */}
      <Sticker className="left-[2%] -top-[7%] hidden w-24 rotate-[-16deg] sm:block lg:w-36">
        <path d="M50 4 C76 20 82 54 72 80 H28 C18 54 24 20 50 4Z" fill="#fff" {...OUTLINE} />
        <circle cx="50" cy="38" r="11" fill="#4da2ff" {...OUTLINE} />
        <path d="M28 64 L8 92 L36 82Z M72 64 L92 92 L64 82Z" fill="#fb4903" {...OUTLINE} />
        <path d="M40 80 H60 L56 96 H44Z" fill="#e9ccff" {...OUTLINE} />
      </Sticker>
      {/* pièce souriante */}
      <Sticker className="-top-[20%] right-[4%] w-12 rotate-[8deg] sm:right-[36%] sm:top-[30%] sm:w-20 lg:w-28">
        <circle cx="50" cy="50" r="42" fill="#ffd731" {...OUTLINE} />
        <ellipse cx="36" cy="40" rx="8" ry="11" fill="#fff" {...OUTLINE} />
        <ellipse cx="62" cy="40" rx="8" ry="11" fill="#fff" {...OUTLINE} />
        <circle cx="38" cy="42" r="3.5" fill="#000" />
        <circle cx="64" cy="42" r="3.5" fill="#000" />
        <path d="M30 62 Q50 82 72 62" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
      </Sticker>
      {/* portefeuille */}
      <Sticker className="right-[7%] top-[44%] hidden w-24 rotate-[14deg] sm:block lg:w-36">
        <rect x="6" y="22" width="88" height="62" rx="16" fill="#5c4ade" {...OUTLINE} />
        <path d="M14 22 L50 8 L80 22Z" fill="#55db9c" {...OUTLINE} />
        <rect x="62" y="44" width="34" height="22" rx="11" fill="#e9ccff" {...OUTLINE} />
        <circle cx="76" cy="55" r="4" fill="#000" />
      </Sticker>
      {/* pièce verte */}
      <Sticker className="-top-[22%] left-[3%] w-14 rotate-[-10deg] sm:bottom-[-8%] sm:left-[21%] sm:top-auto sm:w-20 lg:w-32">
        <circle cx="50" cy="50" r="42" fill="#55db9c" {...OUTLINE} />
        <circle cx="50" cy="50" r="30" fill="none" {...OUTLINE} />
        <path d="M36 62 L44 38 L50 56 L56 38 L64 62" fill="none" stroke="#000" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M80 12 L84 22 L94 26 L84 30 L80 40 L76 30 L66 26 L76 22Z" fill="#fff" {...OUTLINE} />
      </Sticker>
    </>
  );
}
