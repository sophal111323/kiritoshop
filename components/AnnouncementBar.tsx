import { getPublicSettings } from "@/lib/publicData";

const TONES: Record<string, string> = {
  info: "border-sky-300 text-white",
  warning: "bg-yellow-400 border-yellow-400 text-yellow-900",
  promo: "bg-green-500 border-green-500 text-white",
};

const TONE_BG: Record<string, string> = {
  info: "linear-gradient(90deg,#0284c7,#38bdf8,#0ea5e9)",
  warning: "",
  promo: "",
};

export default async function AnnouncementBar() {
  const settings = await getPublicSettings();
  if (!settings.announcementEnabled || !settings.announcementText.trim()) return null;

  const tone = settings.announcementTone || "info";
  const cls = TONES[tone] || TONES.info;
  const bg = TONE_BG[tone] || "";

  return (
    <div className={`border-b-2 ${cls}`} style={bg ? { background: bg } : {}}>
      <div className="mx-auto max-w-7xl px-4 py-2 text-center text-xs sm:text-sm font-bold">
        ⚡ {settings.announcementText} ⚡
      </div>
    </div>
  );
}
