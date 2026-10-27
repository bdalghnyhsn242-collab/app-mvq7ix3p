import { useId, type ComponentPropsWithoutRef } from "react";

type LastStandLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Original "LAST STAND" mark: a metallic futuristic shield with an
 * electric-blue crosshair ring and an orange stand chevron. Drawn as
 * inline SVG so it stays crisp at any size with zero image requests.
 */
export function LastStandLogo({ className, title = "شعار Last Stand" }: LastStandLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const steelId = `ls-steel-${uid}`;
  const edgeId = `ls-edge-${uid}`;
  const blueId = `ls-blue-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={steelId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d444d" />
          <stop offset="0.55" stopColor="#23282e" />
          <stop offset="1" stopColor="#101318" />
        </linearGradient>
        <linearGradient id={edgeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9aa4b0" />
          <stop offset="1" stopColor="#4a525c" />
        </linearGradient>
        <linearGradient id={blueId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38e1ff" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path
        d="M32 3 L56.5 11.5 V30.5 C56.5 44.8 47 54.8 32 60.5 C17 54.8 7.5 44.8 7.5 30.5 V11.5 Z"
        fill={`url(#${steelId})`}
        stroke={`url(#${edgeId})`}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 6.5 L53.5 13.8 V30.4 C53.5 42.9 45.2 51.6 32 56.8 C18.8 51.6 10.5 42.9 10.5 30.4 V13.8 Z"
        fill="#0d1015"
        opacity="0.55"
      />
      <circle
        cx="32"
        cy="30"
        r="11.5"
        stroke={`url(#${blueId})`}
        strokeWidth="2.2"
        opacity="0.95"
      />
      <g stroke={`url(#${blueId})`} strokeWidth="2.2" strokeLinecap="round" opacity="0.95">
        <path d="M32 15 V18" />
        <path d="M32 42 V45" />
        <path d="M17.5 30 H20.5" />
        <path d="M43.5 30 H46.5" />
      </g>
      <path
        d="M24.5 33.5 L32 25.5 L39.5 33.5"
        stroke="#f97316"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 38.5 H38" stroke="#38e1ff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

type LastStandBrandProps = {
  iconClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "className">;

/** Icon + bilingual wordmark lockup used on the auth splash and header. */
export function LastStandBrand({
  iconClassName = "h-12 w-12",
  titleClassName = "text-2xl",
  subtitleClassName = "text-xs",
  ...rest
}: LastStandBrandProps) {
  return (
    <div className="flex items-center justify-center gap-3" {...rest}>
      <LastStandLogo className={iconClassName} />
      <div className="text-start">
        <p
          dir="ltr"
          className={`${titleClassName} font-black uppercase leading-none tracking-[0.18em] text-transparent [background:linear-gradient(180deg,#e8edf3,#8f9aa6)] [-webkit-background-clip:text] [background-clip:text]`}
        >
          Last Stand
        </p>
        <p className={`${subtitleClassName} mt-1 font-semibold text-[#38e1ff]`}>الصمود الأخير</p>
      </div>
    </div>
  );
}