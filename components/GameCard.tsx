import Link from "next/link";

interface GameCardProps {
  slug: string;
  name: string;
  publisher: string;
  currencyName: string;
  imageUrl: string;
  featured?: boolean;
  href?: string;
  isOutOfStock?: boolean;
  dailyLimit?: number | null;
  todayPaidCount?: number;
}

export default function GameCard({
  slug,
  name,
  publisher,
  currencyName,
  imageUrl,
  featured,
  href,
  isOutOfStock,
}: GameCardProps) {
  const linkHref = href || `/games/${slug}`;

  const cardContent = (
    <div
      className={`relative flex flex-col items-center rounded-2xl border-2 transition-all duration-500 p-2 sm:p-3.5 ${
        isOutOfStock
          ? "border-red-200/80 bg-gray-50/70 opacity-90 shadow-none cursor-not-allowed"
          : "border-sky-200 bg-white group-hover:border-transparent group-hover:shadow-xl group-hover:shadow-sky-200/60"
      }`}
    >
      {/* Game image */}
      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-sky-50 mb-2 sm:mb-2.5">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out ${
            isOutOfStock ? "grayscale contrast-90 opacity-75" : "group-hover:scale-110"
          }`}
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : { background: "linear-gradient(135deg,#e0f2fe,#bae6fd)" }}
        />

        {/* Shine sweep (only when available) */}
        {!isOutOfStock && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <div className="absolute -inset-y-1 -left-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-700 ease-out group-hover:left-[150%]" />
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-2 text-center z-10">
            <div className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider shadow-lg">
              <span>🔒 អស់ស្តុក</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-white/90 font-bold mt-1">Out of Stock</span>
          </div>
        ) : featured ? (
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 badge-best flex items-center gap-1 text-[8px] sm:text-[9px] px-2 py-0.5">
            <svg className="h-2 w-2 sm:h-2.5 sm:w-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
            </svg>
            HOT
          </div>
        ) : null}
      </div>

      {/* Game name */}
      <h3
        className={`font-display font-extrabold text-[11px] sm:text-base text-center leading-tight mb-2 sm:mb-2.5 line-clamp-2 min-h-[28px] sm:min-h-[38px] flex items-center justify-center transition-colors duration-300 ${
          isOutOfStock ? "text-gray-500" : "text-sky-950 group-hover:text-sky-600"
        }`}
      >
        {name}
      </h3>

      {/* Action button */}
      {isOutOfStock ? (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full rounded-xl bg-gray-200 border border-gray-300 text-gray-500 !py-1.5 sm:!py-2 !text-xs sm:!text-sm font-bold shadow-none cursor-not-allowed select-none"
        >
          អស់ស្តុក
        </button>
      ) : (
        <button className="btn-buy !py-1.5 sm:!py-2 !text-xs sm:!text-sm font-bold group-hover:bg-red-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-red-500/30">
          Buy
        </button>
      )}
    </div>
  );

  if (isOutOfStock) {
    return (
      <div
        className="game-card relative block rounded-2xl cursor-not-allowed select-none"
        title="ហ្គេមនេះបានលក់អស់ស្តុកសម្រាប់ថ្ងៃនេះហើយ (Out of Stock)"
      >
        {cardContent}
      </div>
    );
  }

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
      {cardContent}
    </Link>
  );
}
