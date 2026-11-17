"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "./Modal";

type Props = {
  /** The raw image source (data URL or object URL) to crop. */
  src: string;
  /** Output size in px (square). */
  outputSize?: number;
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
};

/**
 * A lightweight square-crop modal.
 * - Drag to pan the image under a fixed square viewport.
 * - Scroll-wheel or pinch to zoom.
 * - "Crop & Save" produces a square PNG data URL.
 */
export default function ImageCropModal({ src, outputSize = 600, onCrop, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Natural dimensions of the loaded image
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Transform state: scale and translate (in CSS px relative to the container)
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // The fixed square viewport size (CSS px) — fits the container
  const VIEWPORT = 280;

  // When the image loads, fit it so the shorter side fills the viewport
  const onLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      imgRef.current = img;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNatural({ w: nw, h: nh });

      const fitScale = VIEWPORT / Math.min(nw, nh);
      setScale(fitScale);
      // Centre the image
      setPos({
        x: (VIEWPORT - nw * fitScale) / 2,
        y: (VIEWPORT - nh * fitScale) / 2,
      });
    },
    [VIEWPORT]
  );

  // Clamp position so the image always covers the viewport
  const clamp = useCallback(
    (x: number, y: number, s: number, nw: number, nh: number) => {
      const imgW = nw * s;
      const imgH = nh * s;
      return {
        x: Math.min(0, Math.max(VIEWPORT - imgW, x)),
        y: Math.min(0, Math.max(VIEWPORT - imgH, y)),
      };
    },
    [VIEWPORT]
  );

  // --- Drag (mouse + touch) ---
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!natural) return;
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [natural, pos]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !natural) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const clamped = clamp(dragStart.current.px + dx, dragStart.current.py + dy, scale, natural.w, natural.h);
      setPos(clamped);
    },
    [natural, scale, clamp]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // --- Zoom (wheel) ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !natural) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Cursor position inside the viewport
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setScale((prev) => {
        const minScale = VIEWPORT / Math.min(natural.w, natural.h);
        const next = Math.max(minScale, Math.min(prev * (1 - e.deltaY * 0.002), minScale * 8));

        // Zoom toward cursor
        setPos((p) => {
          const nx = cx - ((cx - p.x) / prev) * next;
          const ny = cy - ((cy - p.y) / prev) * next;
          return clamp(nx, ny, next, natural.w, natural.h);
        });

        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [natural, clamp, VIEWPORT]);

  // --- Produce the cropped output ---
  const doCrop = useCallback(() => {
    if (!imgRef.current || !natural) return;

    // The viewport rectangle in image-natural-pixel coordinates
    const sx = -pos.x / scale;
    const sy = -pos.y / scale;
    const sSize = VIEWPORT / scale;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
    onCrop(canvas.toDataURL("image/png"));
  }, [natural, pos, scale, outputSize, onCrop, VIEWPORT]);

  return (
    <Modal title="Crop image" onClose={onCancel}>
      <p className="mb-3 text-xs opacity-70">Drag to reposition. Scroll to zoom. The square area will be saved.</p>

      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="relative cursor-grab overflow-hidden rounded-2xl border-2 border-dashed active:cursor-grabbing"
          style={{ width: VIEWPORT, height: VIEWPORT, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Crop preview"
            onLoad={onLoad}
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              transformOrigin: "0 0",
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              maxWidth: "none",
              width: natural ? natural.w : "auto",
              height: natural ? natural.h : "auto",
              imageRendering: scale > 2 ? "pixelated" : "auto",
            }}
          />
          {/* Square guide overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/60 ring-inset" />
        </div>
      </div>

      {/* Zoom slider */}
      {natural && (
        <div className="mx-auto mt-3 flex w-64 items-center gap-2 text-xs">
          <span>−</span>
          <input
            type="range"
            min={VIEWPORT / Math.min(natural.w, natural.h)}
            max={VIEWPORT / Math.min(natural.w, natural.h) * 8}
            step="any"
            value={scale}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPos((p) => {
                // Zoom toward centre
                const cx = VIEWPORT / 2;
                const cy = VIEWPORT / 2;
                const nx = cx - ((cx - p.x) / scale) * next;
                const ny = cy - ((cy - p.y) / scale) * next;
                return clamp(nx, ny, next, natural.w, natural.h);
              });
              setScale(next);
            }}
            className="flex-1"
          />
          <span>+</span>
        </div>
      )}

      <div className="mt-4 flex justify-between gap-2">
        <button type="button" onClick={onCancel} className="emp-bd rounded-full border-2 px-5 py-2">
          Cancel
        </button>
        <button
          type="button"
          onClick={doCrop}
          disabled={!natural}
          className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold disabled:opacity-50"
        >
          Crop &amp; save
        </button>
      </div>
    </Modal>
  );
}
