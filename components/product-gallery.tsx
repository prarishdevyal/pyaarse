"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { slideIndex, stepIndex } from "@/lib/gallery";

/** Swipeable product photos (native scroll-snap, so swipes keep their momentum) with a full-screen viewer. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const many = images.length > 1;

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(slideIndex(el.scrollLeft, el.clientWidth, images.length));
  };
  const goTo = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" });

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[14px] shadow-soft"
          aria-roledescription="carousel"
          aria-label={`${name} photos`}
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setViewer(i)}
              className="w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Open photo ${i + 1} of ${images.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={i === 0 ? name : ""} className="aspect-square w-full object-cover" draggable={false} loading={i === 0 ? "eager" : "lazy"} />
            </button>
          ))}
        </div>
        {many && (
          <>
            <ArrowButton side="left" onClick={() => goTo(stepIndex(index, -1, images.length))} />
            <ArrowButton side="right" onClick={() => goTo(stepIndex(index, 1, images.length))} />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((src, i) => (
                <span key={src} className={`h-1.5 rounded-full bg-ivory shadow transition-all duration-300 ${i === index ? "w-5" : "w-1.5 opacity-60"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {many && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`w-20 shrink-0 overflow-hidden rounded-xl border-2 transition sm:w-24 ${i === index ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {viewer !== null && <Viewer images={images} name={name} start={viewer} onClose={(i) => { setViewer(null); goTo(i); }} />}
    </div>
  );
}

function ArrowButton({ side, onClick, dark }: { side: "left" | "right"; onClick: () => void; dark?: boolean }) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`step-btn absolute top-1/2 hidden -translate-y-1/2 rounded-full p-2 shadow-soft md:block ${side === "left" ? "left-3" : "right-3"} ${dark ? "bg-ivory/15 text-ivory hover:bg-ivory/25" : "bg-ivory/90 text-charcoal hover:bg-ivory"}`}
    >
      <Icon size={20} aria-hidden />
    </button>
  );
}

/** Full-screen photo viewer: swipe, arrow keys, Esc or ✕ to close. */
function Viewer({ images, name, start, onClose }: { images: string[]; name: string; start: number; onClose: (index: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const indexRef = useRef(start);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    goTo(start, false);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(stepIndex(indexRef.current, 1, images.length));
      if (e.key === "ArrowLeft") goTo(stepIndex(indexRef.current, -1, images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [start, goTo, images.length]);

  return (
    <dialog
      ref={dialog}
      onClose={() => onClose(indexRef.current)}
      aria-label={`${name} photos`}
      className="anim-fade m-0 h-dvh max-h-none w-screen max-w-none bg-charcoal/95 p-0 text-ivory backdrop:bg-charcoal/80"
    >
      <div
        ref={track}
        onScroll={() => {
          const el = track.current;
          if (el) setIndex(slideIndex(el.scrollLeft, el.clientWidth, images.length));
        }}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain"
      >
        {images.map((src, i) => (
          <div
            key={src}
            onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4 sm:p-12"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${name}, photo ${i + 1}`} className="max-h-full max-w-full rounded-lg object-contain" draggable={false} />
          </div>
        ))}
      </div>
      <p className="absolute left-4 top-4 rounded-full bg-ivory/15 px-3 py-1 text-sm" aria-live="polite">{index + 1} / {images.length}</p>
      <button
        type="button"
        onClick={() => dialog.current?.close()}
        aria-label="Close"
        autoFocus
        className="step-btn absolute right-4 top-4 rounded-full bg-ivory/15 p-2 hover:bg-ivory/25"
      >
        <CloseIcon size={22} aria-hidden />
      </button>
      {images.length > 1 && (
        <>
          <ArrowButton side="left" dark onClick={() => goTo(stepIndex(index, -1, images.length))} />
          <ArrowButton side="right" dark onClick={() => goTo(stepIndex(index, 1, images.length))} />
        </>
      )}
    </dialog>
  );
}
