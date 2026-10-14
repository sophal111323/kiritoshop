import Link from "next/link";

interface GameCardProps {
  slug: string;
  name: string;
  publisher: string;
  currencyName: string;
  imageUrl: string;
  featured?: boolean;
  href?: string;
}

export default function GameCard({ slug, name, publisher, currencyName, imageUrl, featured, href }: GameCardProps) {
  const linkHref = href || `/games/${slug}`;
  return (
    <Link
      href={linkHref}
      className="game-card group relative block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      {/* Glow border on hover */}
      <span
        className="pointer-events-none absolute -inset-[2px] rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg,#0284c7,#38bdf8,#0ea5e9)" }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center rounded-2xl border-2 border-sky-200 bg-white p-2 sm:p-3.5 transition-all duration-500 group-hover:border-transparent group-hover:shadow-xl group-hover:shadow-sky-200/60">
        {/* Game image */}
        <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-sky-50 mb-2 sm:mb-2.5">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
            style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : { background: "linear-gradient(135deg,#e0f2fe,#bae6fd)" }}
          />

          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <div className="absolute -inset-y-1 -left-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-700 ease-out group-hover:left-[150%]" />
          </div>

          {featured && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 badge-best flex items-center gap-1 text-[8px] sm:text-[9px] px-2 py-0.5">
              <svg className="h-2 w-2 sm:h-2.5 sm:w-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
              </svg>
              HOT
            </div>
          )}
        </div>

        {/* Game name */}
        <h3 className="font-display font-extrabold text-[11px] sm:text-base text-center leading-tight mb-2 sm:mb-2.5 text-sky-950 transition-colors duration-300 group-hover:text-sky-600 line-clamp-2 min-h-[28px] sm:min-h-[38px] flex items-center justify-center">
          {name}
        </h3>

        {/* Buy button */}
        <button className="btn-buy !py-1.5 sm:!py-2 !text-xs sm:!text-sm font-bold group-hover:bg-red-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-red-500/30">
          Buy
        </button>
      </div>
    </Link>
  );
}
