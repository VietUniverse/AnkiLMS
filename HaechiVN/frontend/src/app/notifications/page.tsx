"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { useApp } from "../../contexts/AppProvider";
import { ApiClient, AppNotification } from "../../lib/apiClient";
import { Bell, CheckCheck, LoaderCircle, RefreshCw } from "lucide-react";

function formatTime(value: string) {
  const date = new Date(value.endsWith("Z") || value.includes("+") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const { currentUser, handleOpenAuth } = useApp();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    void ApiClient.getNotifications()
      .then((data) => {
        setItems(data.notifications);
        setUnread(data.unread);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser, load]);

  const markAll = async () => {
    setBusy(true);
    try {
      const data = await ApiClient.markNotificationsRead({ all: true });
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* bỏ qua lỗi mạng, người dùng bấm lại được */
    } finally {
      setBusy(false);
    }
  };

  const openItem = (item: AppNotification) => {
    if (item.readAt) return;
    void ApiClient.markNotificationsRead({ id: item.id })
      .then((data) => {
        setItems(data.notifications);
        setUnread(data.unread);
      })
      .catch(() => undefined);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-4 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Thông báo</h1>
            {unread > 0 && (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-800">{unread} chưa đọc</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tải lại
            </button>
            <button
              type="button"
              onClick={markAll}
              disabled={busy || unread === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2 text-[11px] font-black text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Đọc tất cả
            </button>
          </div>
        </div>

        {!currentUser ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-[#1e3466] dark:bg-[#0f1b38]">
            <p className="text-sm font-bold text-white">Đăng nhập để xem thông báo</p>
            <button
              type="button"
              onClick={() => handleOpenAuth(false)}
              className="mt-3 rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-sky-600"
            >
              Đăng nhập
            </button>
          </div>
        ) : loading ? (
          <p className="py-8 text-center text-xs font-bold text-slate-700">Đang tải thông báo…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-[#1e3466] dark:bg-[#0f1b38]">
            <Bell className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Chưa có thông báo nào.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-[#1e3466] dark:bg-[#0f1b38]">
            {items.map((item) => {
              const content = (
                <div className={`flex items-start gap-3 p-4 ${item.readAt ? "" : "bg-sky-50/60 dark:bg-sky-500/5"}`}>
                  <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${item.readAt ? "text-slate-400" : "text-sky-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white">{item.title}</p>
                    {item.body && <p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-700">{item.body}</p>}
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{formatTime(item.createdAt)}</p>
                  </div>
                  {!item.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-label="Chưa đọc" />}
                </div>
              );
              return item.link ? (
                <Link key={item.id} href={item.link} onClick={() => openItem(item)} className="block hover:bg-slate-50 dark:hover:bg-white/5">
                  {content}
                </Link>
              ) : (
                <button key={item.id} type="button" onClick={() => openItem(item)} className="block w-full cursor-pointer text-left">
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
