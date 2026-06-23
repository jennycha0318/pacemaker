"use client";

import { useRef, useState } from "react";
import type { Diagnosis } from "@/lib/diagnose/engine";

const MAX = 3;

// 캡처를 최대 1024px JPEG로 리사이즈(전송량·비용 절감, Vercel 본문 한도 회피)
function fileToResized(file: File, maxDim = 1024): Promise<{ media_type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve({ media_type: "image/jpeg", data: dataUrl.split(",")[1] ?? "" });
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

export function KakaoAnalysis({ d }: { d: Diagnosis }) {
  const [previews, setPreviews] = useState<{ url: string; file: File }[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX);
    setPreviews(files.map((file) => ({ url: URL.createObjectURL(file), file })));
    setAnalysis(null);
    setErr("");
  }

  async function analyze() {
    if (previews.length === 0 || loading) return;
    setLoading(true);
    setErr("");
    try {
      const images = await Promise.all(previews.map((p) => fileToResized(p.file)));
      const context = `점수:${d.score}점(${d.scoreTitle}) / 추천 타이밍:${d.plan?.when ?? ""} / 해석:${(d.reason ?? "").slice(0, 400)}`;
      const res = await fetch("/api/analyze-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, context }),
      });
      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis);
      else setErr(data.error || "분석을 가져오지 못했어요.");
    } catch {
      setErr("이미지 처리 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mt-5 border border-accent/30 bg-accent/5">
      <p className="mb-1 flex items-center gap-2 text-[15px] font-bold text-ink">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-accent">
          <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="9" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
        카톡 대화도 분석해볼까요?
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">추가 분석</span>
      </p>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
        상대와의 카톡 캡처(최대 {MAX}장)를 올리면 상대의 관심도·온도·연락 패턴을 함께 분석해 드려요. <b className="text-primaryDark">유료 옵션(준비 중)</b>이에요.
      </p>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} aria-label="카톡 캡처 선택" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-2xl border border-dashed border-accent/50 bg-white/50 py-3 text-sm font-bold text-primaryDark transition active:scale-[0.98] hover:bg-white/70"
      >
        캡처 선택 (최대 {MAX}장)
      </button>

      {previews.length > 0 && (
        <div className="mt-3 flex gap-2">
          {previews.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.url} alt={`캡처 ${i + 1}`} className="h-16 w-16 rounded-lg border border-line object-cover" />
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <button className="btn btn-primary mt-3" onClick={analyze} disabled={loading}>
          {loading ? "분석 중…" : `대화 분석하기 (${previews.length}장)`}
        </button>
      )}

      {err && <p className="mt-2 text-center text-[13px] text-bad">{err}</p>}

      {analysis && (
        <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-line bg-surface p-4 text-[14px] leading-relaxed">{analysis}</div>
      )}
    </div>
  );
}
