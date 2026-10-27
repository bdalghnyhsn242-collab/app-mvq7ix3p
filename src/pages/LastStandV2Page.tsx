import { Link } from "react-router-dom";
import GameV2 from "@/game/v2/GameV2";

/**
 * Clean-rebuild basic version (v2). The original full game stays untouched
 * at "/" — this page only mounts the new minimal build.
 */
export default function LastStandV2Page() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            الصمود الأخير — النسخة الأساسية الجديدة{" "}
            <span dir="ltr" className="text-lg text-sky-300">v2</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-400">
            إعادة بناء نظيفة: جزيرة خفيفة + جندي GLB حقيقي بحركات Idle/Walk/Run + سلاح
            واحد وأعداء تجريبيون. النسخة الكاملة القديمة متاحة على{" "}
            <Link to="/" className="text-sky-300 underline">
              الصفحة الرئيسية
            </Link>
            .
          </p>
        </div>
        <GameV2 />
      </div>
    </div>
  );
}