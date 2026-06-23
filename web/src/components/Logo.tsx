// 큐핏(Qpit) 로고 — 파스텔 하트 + 금색 활·하트화살(심볼).
export function Logo({ size = 40, className = "", decorative = false }: { size?: number; className?: string; decorative?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "큐핏 로고"}
      aria-hidden={decorative ? true : undefined}
      className={className}
    >
      <defs>
        <linearGradient id="qpGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a8fd8" />
          <stop offset="0.5" stopColor="#7c9ed4" />
          <stop offset="1" stopColor="#5cc1bf" />
        </linearGradient>
        <linearGradient id="qpFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfc7ef" />
          <stop offset="0.5" stopColor="#bcd0ee" />
          <stop offset="1" stopColor="#a9e6e2" />
        </linearGradient>
        <linearGradient id="qpGold" x1="100" y1="170" x2="410" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#efd07a" />
          <stop offset="0.5" stopColor="#d6a93f" />
          <stop offset="1" stopColor="#b07e1c" />
        </linearGradient>
      </defs>

      {/* 파스텔 하트 (배경) */}
      <path
        d="M256 150 C210 80 110 70 70 140 C30 205 55 290 130 350 L256 460 L382 350 C457 290 482 205 442 140 C402 70 302 80 256 150 Z"
        fill="url(#qpFill)"
        stroke="url(#qpGrad)"
        strokeWidth="16"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 활 + 화살 (금색) */}
      <g stroke="url(#qpGold)" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M170 172 Q100 265 170 358" strokeWidth="14" />
        <path d="M170 172 L170 358" strokeWidth="7" />
        <line x1="158" y1="265" x2="392" y2="265" strokeWidth="13" />
      </g>
      {/* 화살촉 — 하트 (금색 채움) */}
      <path
        d="M408 256 c-5 -10 -20 -7 -20 4 c0 9 13 16 20 22 c7 -6 20 -13 20 -22 c0 -11 -15 -14 -20 -4 Z"
        fill="url(#qpGold)"
        transform="rotate(90 408 265)"
      />
    </svg>
  );
}

// 로고 + 워드마크
export function BrandLockup({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} decorative />
      <span className="font-display text-[22px] font-bold tracking-tight text-ink">큐핏</span>
    </div>
  );
}
