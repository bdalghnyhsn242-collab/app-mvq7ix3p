import { Navigate } from "react-router-dom";
import { AUTH_ENABLED } from "@/config/features";
import { LastStandBrand } from "@/components/brand/LastStandLogo";
import { AuthForm } from "@/components/auth/AuthForm";

/**
 * Military splash screen shown before entering the game when auth is
 * enabled. Background effects are pure CSS (opacity/transform only) so
 * they stay light on 4GB-RAM integrated graphics.
 */
export default function AuthPage() {
  if (!AUTH_ENABLED) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b0e13] px-4 py-10">
      {/* Ambient background: radial glow + tactical grid + scanline */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="ls-glow absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 45% at 50% 18%, rgba(37,99,235,0.22), transparent 70%), radial-gradient(45% 35% at 82% 85%, rgba(249,115,22,0.10), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(154,164,176,0.5) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(154,164,176,0.5) 0 1px, transparent 1px 44px)",
          }}
        />
        <div
          className="ls-scan absolute inset-x-0 h-24 opacity-[0.04]"
          style={{
            background: "linear-gradient(180deg, transparent, #38e1ff, transparent)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LastStandBrand iconClassName="h-16 w-16" titleClassName="text-3xl" subtitleClassName="text-sm" />
          <p className="max-w-xs text-sm leading-6 text-slate-400">
            لعبة باتل رويال ثلاثية الأبعاد — انزل إلى الجزيرة، واجه 100 مقاتل، وكن آخر الصامدين.
          </p>
        </div>
        <AuthForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          بيانات دخولك محفوظة عبر مصادقة Supabase المشفّرة — لا نحتفظ بكلمات المرور في المتصفح.
        </p>
      </div>
    </div>
  );
}