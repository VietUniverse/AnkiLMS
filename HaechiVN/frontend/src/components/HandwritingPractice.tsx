"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

type Point = { x: number; y: number };
type Stroke = Point[];

export function HandwritingPractice({ word, revealed }: { word: string; revealed: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => { setStrokes([]); setShowGuide(false); }, [word]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const paint = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, bounds.width, bounds.height);
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      for (const y of [bounds.height / 3, bounds.height * 2 / 3]) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(bounds.width, y); ctx.stroke();
      }
      ctx.setLineDash([]);
      if (showGuide || revealed) {
        ctx.fillStyle = "rgba(56, 189, 248, .2)";
        ctx.font = `bold ${Math.min(68, Math.max(30, bounds.width / Math.max(word.length, 4)))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(word, bounds.width / 2, bounds.height / 2, bounds.width - 24);
      }
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const stroke of strokes) {
        if (!stroke.length) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * bounds.width, stroke[0].y * bounds.height);
        if (stroke.length === 1) ctx.lineTo(stroke[0].x * bounds.width + .1, stroke[0].y * bounds.height + .1);
        for (const point of stroke.slice(1)) ctx.lineTo(point.x * bounds.width, point.y * bounds.height);
        ctx.stroke();
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [strokes, showGuide, revealed, word]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
  };

  return <div className="space-y-3">
    <canvas
      ref={canvasRef}
      aria-label="Bảng tập viết tiếng Hàn"
      className="h-56 w-full rounded-2xl border border-stone-300 bg-white touch-none dark:border-stone-700 dark:bg-stone-950"
      onPointerDown={(event) => { const next = point(event); drawingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); setStrokes((old) => [...old, [next]]); }}
      onPointerMove={(event) => { if (!drawingRef.current) return; const next = point(event); setStrokes((old) => { const copy = [...old]; copy[copy.length - 1] = [...copy[copy.length - 1], next]; return copy; }); }}
      onPointerUp={() => { drawingRef.current = false; }}
      onPointerCancel={() => { drawingRef.current = false; }}
    />
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setStrokes((old) => old.slice(0, -1))} disabled={!strokes.length} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:border-stone-700">Lùi một nét</button>
      <button type="button" onClick={() => setStrokes([])} disabled={!strokes.length} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:border-stone-700"><RotateCcw className="h-3.5 w-3.5" /> Viết lại</button>
      <button type="button" onClick={() => setShowGuide((value) => !value)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold dark:border-stone-700">{showGuide ? "Ẩn nét mẫu" : "Hiện nét mẫu"}</button>
    </div>
  </div>;
}
