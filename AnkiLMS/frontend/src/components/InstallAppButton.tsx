"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { useInstallApp, useInstallPlatform, type InstallPlatform } from "../lib/installApp";

const STEPS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: {
    title: "Cài trên iPhone",
    steps: [
      "Mở trang này bằng Safari (nếu đang mở trong Facebook, Zalo... hãy chọn mở bằng Safari).",
      "Bấm nút Chia sẻ (hình vuông có mũi tên hướng lên) ở thanh dưới.",
      "Kéo xuống và chọn “Thêm vào Màn hình chính”.",
      "Bấm “Thêm” ở góc trên bên phải.",
    ],
  },
  ipados: {
    title: "Cài trên iPad",
    steps: [
      "Mở trang này bằng Safari.",
      "Bấm nút Chia sẻ (hình vuông có mũi tên hướng lên) cạnh thanh địa chỉ.",
      "Chọn “Thêm vào Màn hình chính”, rồi bấm “Thêm”.",
    ],
  },
  "mac-safari": {
    title: "Cài trên Safari (Mac)",
    steps: [
      "Cần Safari 17 trở lên.",
      "Bấm nút Chia sẻ trên thanh công cụ, hoặc mở menu Tệp.",
      "Chọn “Thêm vào Dock”, rồi bấm “Thêm”.",
    ],
  },
  "android-firefox": {
    title: "Cài trên Firefox (Android)",
    steps: ["Bấm nút menu ba chấm ở góc trên hoặc dưới.", "Chọn “Cài đặt” (hoặc “Thêm vào màn hình chính”).", "Bấm “Thêm” để xác nhận."],
  },
  "desktop-firefox": {
    title: "Firefox máy tính",
    steps: ["Firefox trên máy tính chưa hỗ trợ cài ứng dụng web.", "Hãy mở HaechiVN bằng Chrome, Edge hoặc Safari rồi bấm nút cài lại nhé."],
  },
  samsung: {
    title: "Cài trên Samsung Internet",
    steps: [
      "Nếu thấy biểu tượng cài đặt ở thanh địa chỉ, bấm vào đó.",
      "Hoặc bấm nút menu (ba gạch) ở thanh dưới.",
      "Chọn “Thêm trang vào” rồi “Màn hình chính”, sau đó bấm “Thêm”.",
    ],
  },
  other: {
    title: "Cài ứng dụng",
    steps: [
      "Tìm biểu tượng cài đặt ở cuối thanh địa chỉ (hình màn hình có mũi tên xuống).",
      "Hoặc mở menu ba chấm và chọn “Cài đặt HaechiVN” (Install app).",
      "Trình duyệt chưa cho phép cài tự động nếu đây là lần đầu bạn vào, hãy tải lại trang một lần rồi thử lại.",
    ],
  },
};

type Variant = "sidebar" | "card";

export function InstallAppButton({ variant = "sidebar", onDone }: { variant?: Variant; onDone?: () => void }) {
  const { installed, canPrompt, install } = useInstallApp();
  const platform = useInstallPlatform();
  const [help, setHelp] = useState(false);

  if (installed) return null;

  const handle = async () => {
    if (canPrompt) {
      await install();
      onDone?.();
    } else {
      setHelp(true);
    }
  };

  const guide = STEPS[platform];

  return (
    <>
      <button
        type="button"
        onClick={handle}
        style={variant === "card" ? { color: "#fff" } : undefined}
        className={
          variant === "card"
            ? "flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black shadow-sm transition hover:bg-sky-600 active:scale-[0.99]"
            : "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-sky-300 transition hover:bg-[#111c38] hover:text-sky-200"
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Cài ứng dụng</span>
      </button>

      {help && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={() => setHelp(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-2xl dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="install-title" className="text-base font-black">{guide.title}</h2>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Dùng như một ứng dụng: mở nhanh từ màn hình chính, toàn màn hình.</p>
              </div>
              <button type="button" onClick={() => setHelp(false)} aria-label="Đóng" className="rounded-lg p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <ol className="space-y-2.5 text-sm">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-black text-sky-700 dark:text-sky-300">{index + 1}</span>
                  <span className="min-w-0">{step}</span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setHelp(false)} className="w-full cursor-pointer rounded-xl bg-stone-100 py-2.5 text-sm font-bold hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700">Đã hiểu</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
