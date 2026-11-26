"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    setToken(raw);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Hai mật khẩu không trùng nhau."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Không thể đặt lại mật khẩu.");
      setMessage(data.message || "Đã đổi mật khẩu.");
      setToken(""); setPassword(""); setConfirm("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đặt lại mật khẩu."); }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#0b1329] px-4 py-10 text-white">
    <section className="w-full max-w-md rounded-2xl bg-[#111c38] p-7 shadow-xl">
      <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
      {message ? <><p role="status" className="mt-4 text-sm text-emerald-300">{message}</p><Link href="/login" className="mt-6 inline-block text-sm text-blue-300 hover:underline">Đăng nhập</Link></>
        : !token ? <><p className="mt-4 text-sm text-rose-300">Liên kết không hợp lệ. Hãy yêu cầu một liên kết mới.</p><Link href="/forgot-password" className="mt-6 inline-block text-sm text-blue-300 hover:underline">Yêu cầu liên kết mới</Link></>
        : <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold" htmlFor="new-password">Mật khẩu mới</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl bg-[#132247] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-sm font-semibold" htmlFor="confirm-password">Nhập lại mật khẩu</label>
          <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="w-full rounded-xl bg-[#132247] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
          <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500 disabled:opacity-60">{loading ? "Đang cập nhật..." : "Đổi mật khẩu"}</button>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        </form>}
    </section>
  </main>;
}
