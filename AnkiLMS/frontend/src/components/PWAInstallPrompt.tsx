"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [mobile, setMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isMobile = isIos || /Android|Mobile/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIos(isIos);
    setMobile(isMobile && !standalone);
    setDismissed(sessionStorage.getItem("haechivn_install_dismissed") === "1");

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setMobile(false);
      setHelpOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) { setHelpOpen(true); return; }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setMobile(false);
    setInstallEvent(null);
  };

  if (!mobile || dismissed) return null;

  return (
    <>
      <div className="lg:hidden fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-xl dark:border-sky-300/30 dark:bg-[#101d38] dark:text-white">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300"><Download aria-hidden="true" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">Cài HaechiVN</p><p className="text-xs text-slate-500 dark:text-slate-300">Thêm vào màn hình chính để mở nhanh</p></div>
        <button onClick={install} className="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-500">Cài</button>
        <button onClick={() => { setDismissed(true); sessionStorage.setItem("haechivn_install_dismissed", "1"); }} aria-label="Đóng gợi ý cài ứng dụng" className="grid h-10 w-8 place-items-center text-slate-400 dark:text-slate-300"><X className="h-4 w-4" /></button>
      </div>
      {helpOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setHelpOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-help-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#101d38] dark:text-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><h2 id="install-help-title" className="font-black">Thêm HaechiVN vào màn hình chính</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">Trình duyệt này chưa cung cấp nút cài đặt tự động. Bạn có thể thêm lối tắt từ menu chia sẻ/trình duyệt.</p></div><button onClick={() => setHelpOpen(false)} aria-label="Đóng" className="p-1 text-slate-400 dark:text-slate-300"><X className="h-4 w-4" /></button></div>
            <div className="mt-4 rounded-xl bg-slate-100 p-3 dark:bg-[#0b1329] text-sm font-semibold leading-6">{ios ? <><Share aria-hidden="true" className="mr-2 inline h-4 w-4 text-sky-600 dark:text-sky-300" />Chạm <b>Chia sẻ</b> → <b>Thêm vào Màn hình chính</b>.</> : <>Mở menu <b>⋮</b> hoặc <b>☰</b> → chọn <b>Cài đặt ứng dụng</b>, <b>Thêm vào màn hình chính</b> hoặc <b>Cài đặt</b>.</>}</div>
          </section>
        </div>
      )}
    </>
  );
}
