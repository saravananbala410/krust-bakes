"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Swipeable photo slider with arrows, dots, optional thumbnails and auto-play. */
export function PhotoCarousel({ photos, alt, className = "", autoPlayMs, thumbnails = false, rounded = "rounded-[22px]" }: { photos: string[]; alt: string; className?: string; autoPlayMs?: number; thumbnails?: boolean; rounded?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = photos.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (!autoPlayMs || count < 2 || paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), autoPlayMs);
    return () => clearTimeout(t);
  }, [index, autoPlayMs, count, paused]);

  if (!count) return null;
  const current = index % count;
  return (
    <div className={className}>
      <div
        className={`group relative overflow-hidden bg-peach ${rounded}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
          {photos.map((src, i) => <img key={src + i} src={src} alt={`${alt} – photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} draggable={false} className="h-full w-full shrink-0 select-none object-cover" />)}
        </div>
        {count > 1 && <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(current - 1); }} aria-label="Previous photo" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"><ChevronLeft size={18} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(current + 1); }} aria-label="Next photo" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"><ChevronRight size={18} /></button>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">{photos.map((_, i) => <button type="button" key={i} onClick={(e) => { e.stopPropagation(); go(i); }} aria-label={`Show photo ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />)}</div>
        </>}
      </div>
      {thumbnails && count > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {photos.map((src, i) => <button type="button" key={src + i} onClick={() => go(i)} aria-label={`Show photo ${i + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === current ? "border-krust" : "border-transparent opacity-70 hover:opacity-100"}`}><img src={src} alt="" className="h-full w-full object-cover" /></button>)}
        </div>
      )}
    </div>
  );
}
