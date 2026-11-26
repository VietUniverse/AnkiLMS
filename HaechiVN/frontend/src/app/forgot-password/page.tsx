"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Không thể gửi yêu cầu.");
      setMessage(data.message || "Hãy kiểm tra hộp thư của bạn.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi yêu cầu."); }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#0b1329] px-4 py-10 text-white">
    <section className="w-full max-w-md rounded-2xl bg-[#111c38] p-7 shadow-xl">
      <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-slate-300">Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="reset-email">Email</label>
        <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl bg-[#132247] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" />
        <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500 disabled:opacity-60">{loading ? "Đang gửi..." : "Gửi liên kết"}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      <Link href="/login" className="mt-6 inline-block text-sm text-blue-300 hover:underline">Quay lại đăng nhập</Link>
    </section>
  </main>;
}
