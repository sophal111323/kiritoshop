import Header from "@/components/Header";
import PublicDataRefresh from "@/components/PublicDataRefresh";
import { getPublicGameBySlug } from "@/lib/publicData";
import Footer from "@/components/Footer";
import TopUpForm from "@/components/TopUpForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Zap } from "lucide-react";
import { getAffiliateBySlug } from "@/lib/affiliate/store";
import AffiliateCookieTracker from "@/components/AffiliateCookieTracker";

export const dynamic = "force-dynamic";

export default async function AffiliateGamesPage({
  params,
}: {
  params: Promise<{ affiliateSlug: string; slug: string }>;
}) {
  const { affiliateSlug, slug } = await params;
  const cleanAffiliate = (affiliateSlug || "").trim().toLowerCase();

  const game = await getPublicGameBySlug(slug);
  if (!game || !game.active) notFound();

  // If valid affiliate, attribute to them; if not found or suspended, still render the game products
  const affiliate = getAffiliateBySlug(cleanAffiliate);

  return (
    <>
      {affiliate && <AffiliateCookieTracker slug={affiliate.slug} />}
      <PublicDataRefresh scope="game" slug={slug} intervalMs={15000} />
      <Header />

      {/* Game banner */}
      <section className="relative overflow-hidden border-b border-fox-border">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: game.bannerUrl ? `url(${game.bannerUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-fox-bg via-fox-bg/90 to-fox-bg/70" />

        <div className="relative mx-auto max-w-6xl px-4 pt-4 pb-3 sm:pt-6 sm:pb-5 sm:px-6 lg:px-8">
          <Link
            href={affiliate ? `/${affiliate.slug}#games` : "/#games"}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-fox-muted hover:text-fox-primary transition-colors mb-2 sm:mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
            All games
          </Link>

          <div className="flex items-center gap-3.5 sm:gap-6">
            <div
              className="h-16 w-16 sm:h-24 sm:w-24 rounded-2xl border-2 border-fox-border bg-fox-card shadow-xl shrink-0 overflow-hidden"
              style={{
                backgroundImage: `url(${game.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-fox-muted mb-0.5">
                {game.publisher}
              </p>
              <h1 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1">
                {game.name}
              </h1>
              <div className="flex items-center gap-2.5">
                <p className="text-fox-accent text-xs sm:text-sm">
                  Top up {game.currencyName}
                </p>
                {(game as any).isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <Lock className="h-2.5 w-2.5" strokeWidth={3} />
                    អស់ស្តុកថ្ងៃនេះ (Out of Stock)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-300">
                    <Zap className="h-2.5 w-2.5" strokeWidth={3} />
                    រហ័សទាន់ចិត្ត
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {(game as any).isOutOfStock ? (
        <main className="mx-auto max-w-xl px-4 pt-8 pb-16 sm:px-6 text-center">
          <div className="rounded-3xl border-2 border-red-200 bg-gradient-to-b from-red-50/90 via-white to-red-50/60 p-6 sm:p-8 shadow-xl shadow-red-500/10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 ring-4 ring-white">
              <Lock className="h-10 w-10 text-white" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black mb-3">
              <span>🔴 ហាងបានលក់អស់ស្តុកសម្រាប់ថ្ងៃនេះ</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
              Game Out of Stock
            </h2>

            <p className="text-sm font-medium text-gray-600 leading-relaxed mb-6">
              ហាង <b>{game.name}</b> បានលក់គ្រប់ចំនួនកំណត់សម្រាប់ថ្ងៃនេះហើយ{game.dailyLimit ? ` (${game.dailyLimit} ឈុត/ថ្ងៃ)` : ""}។
              សូមរង់ចាំការបើកលក់ឡើងវិញនៅថ្ងៃស្អែក ឬទំនាក់ទំនងមកកាន់ Admin តាម Telegram។
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://t.me/kiritostore46"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0088cc] via-[#0099e6] to-[#29b6f6] px-6 py-3 text-sm font-black text-white shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>💬 Contact Admin (@kiritostore46)</span>
              </a>
              <Link
                href={affiliate ? `/${affiliate.slug}#games` : "/#games"}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← ត្រឡប់ទៅទំព័រដើម (All Games)
              </Link>
            </div>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-4 pt-3 pb-8 sm:pt-5 sm:pb-12 sm:px-6 lg:px-8">
          <TopUpForm
            game={{
              id: game.id,
              slug: game.slug,
              name: game.name,
              currencyName: game.currencyName,
              uidLabel: game.uidLabel,
              uidExample: game.uidExample,
              requiresServer: game.requiresServer,
              servers: (() => {
                try {
                  return JSON.parse(game.servers || "[]");
                } catch {
                  return [];
                }
              })(),
              categoryOrder: (() => {
                try {
                  return JSON.parse((game as any).categoryOrder || "[]");
                } catch {
                  return [];
                }
              })(),
              checkIdGameCode: game.checkIdGameCode ?? null,
            }}
            products={game.products.map((p) => ({
              id: p.id,
              name: p.name,
              amount: p.amount,
              bonus: p.bonus,
              priceUsd: p.priceUsd,
              badge: p.badge,
              category: (p as any).category || "Diamonds",
              imageUrl: p.imageUrl,
              inStock: (p as any).inStock !== false,
              isRandomSpin: (p as any).isRandomSpin ?? false,
              randomPackageId: (p as any).randomPackageId ?? null,
              stockLimit: (p as any).stockLimit ?? null,
              dailyLimit: (p as any).dailyLimit ?? null,
              dailyLimitPerUser: (p as any).dailyLimitPerUser ?? null,
              soldCount: (p as any).soldCount ?? 0,
              todaySoldCount: (p as any).todaySoldCount ?? 0,
            }))}
          />
        </main>
      )}

      <Footer />
    </>
  );
}

