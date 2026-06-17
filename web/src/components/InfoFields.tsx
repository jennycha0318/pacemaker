"use client";

import { MBTI_TYPES } from "@/lib/diagnose/personality";

// 출생연도 선택 (만 12~80세 범위)
export function YearSelect({
  value,
  onChange,
  ariaLabel = "출생연도",
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  const cur = new Date().getFullYear();
  const years: number[] = [];
  for (let y = cur - 12; y >= cur - 80; y--) years.push(y);
  return (
    <select className="field-input" value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      <option value="">출생연도 선택</option>
      {years.map((y) => (
        <option key={y} value={y}>{y}년</option>
      ))}
    </select>
  );
}

// MBTI 선택 (선택 입력 — 모름/비공개 허용)
export function MbtiSelect({
  value,
  onChange,
  ariaLabel = "MBTI",
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <select className="field-input" value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      <option value="">모름 / 비공개</option>
      {MBTI_TYPES.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
