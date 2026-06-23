// 큐핏(Qpit) 로고 — 파스텔 하트(심플).
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
      </defs>
      {/* 화살 자루 — 하트 뒤(가운데는 하트에 가려져 '관통' 효과) */}
      <line x1="48" y1="408" x2="411" y2="149" stroke="url(#qpGrad)" strokeWidth="16" strokeLinecap="round" />
      {/* 파스텔 하트 (자루 위) */}
      <path
        d="M256 430 C146 358 86 292 86 222 C86 172 124 136 172 136 C208 136 236 158 256 188 C276 158 304 136 340 136 C388 136 426 172 426 222 C426 292 366 358 256 430 Z"
        fill="url(#qpFill)"
        stroke="url(#qpGrad)"
        strokeWidth="16"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 깃(>>) + 마름모 화살촉 — 하트 위(밖으로 나온 부분만 보임) */}
      <g stroke="url(#qpGrad)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M50 431 L59 400 L37 399" />
        <path d="M76 413 L86 381 L63 380" />
      </g>
      <path d="M466 110 L453 151 L411 149 L423 109 Z" fill="url(#qpGrad)" />
    </svg>
  );
}

// 로고 + 워드마크
export function BrandLockup({ size = 36, className = "", pastel = false }: { size?: number; className?: string; pastel?: boolean }) {
  return (
    <div className={`flex items-center ${pastel ? "gap-1.5" : "gap-2"} ${className}`}>
      <Logo size={size} decorative />
      <span
        className={`font-display font-bold tracking-tight ${
          pastel
            ? "bg-gradient-to-r from-primary to-accent bg-clip-text text-[20px] text-transparent"
            : "text-[22px] text-ink"
        }`}
      >
        큐핏
      </span>
    </div>
  );
}
