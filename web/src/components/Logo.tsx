// 큐핏(Qpit) 로고 — 파스텔 하트 안에 금색 라인아트 큐피드(아기 천사) + 활·하트화살.
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
        <linearGradient id="qpGold" x1="0" y1="0" x2="1" y2="1">
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
        strokeWidth="14"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 금색 큐피드 (아기 천사) — 선화 */}
      <g stroke="url(#qpGold)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 날개 (위로 펼침) */}
        <path d="M188 244 C150 238 116 214 104 176 C128 198 158 214 190 222" />
        <path d="M150 214 q-22 -16 -34 -36" />
        <path d="M244 244 C282 238 316 214 328 176 C304 198 274 214 242 222" />
        <path d="M282 214 q22 -16 34 -36" />
        {/* 머리 */}
        <circle cx="215" cy="205" r="46" />
        {/* 머리카락 (곱슬) */}
        <path d="M175 182 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a13 13 0 0 1 26 0" />
        {/* 귀 */}
        <path d="M170 203 q-9 8 0 19" />
        {/* 눈 (아래를 봄) */}
        <path d="M192 205 q8 6 16 1" />
        <path d="M218 204 q7 5 14 1" />
        {/* 코 */}
        <path d="M210 212 q4 7 -2 9" />
        {/* 입 */}
        <path d="M198 226 q11 6 21 0" />
        {/* 어깨·몸통 */}
        <path d="M186 250 q30 16 60 0 l-6 34 q-24 12 -48 0 Z" />
        {/* 팔 (활을 잡고 당김) */}
        <path d="M242 282 q48 -4 78 2" />
        <path d="M240 272 q30 -2 52 8" />
        {/* 활 */}
        <path d="M316 212 Q360 285 316 358" />
        <path d="M316 212 L284 285 L316 358" />
        {/* 화살 자루 */}
        <line x1="246" y1="285" x2="372" y2="285" />
        {/* 깃 (왼쪽) */}
        <path d="M242 279 l-12 -7" />
        <path d="M242 291 l-12 7" />
        <path d="M252 281 l-11 -6" />
        <path d="M252 289 l-11 6" />
      </g>
      {/* 화살촉 — 하트 모양 (금색 채움) */}
      <path
        d="M378 278 c-4 -7 -15 -5 -15 3 c0 7 9 12 15 16 c6 -4 15 -9 15 -16 c0 -8 -11 -10 -15 -3 Z"
        fill="url(#qpGold)"
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
