"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, LogIn } from "lucide-react";
import { ApiClient, UserProfile } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppProvider";
import { TranslationLanguage } from "../../lib/translationPreference";
import { PolicyAcceptance } from "../../components/PolicyAcceptance";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser, isAuthReady } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState<TranslationLanguage>("vi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<"success" | "invalid" | null>(null);

  // Luôn khóa dark theme khi ở trang login để giữ chuẩn style Anime Dark Glass
  useEffect(() => {
    const prevTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = "dark";
    return () => {
      document.documentElement.dataset.theme = prevTheme || "light";
    };
  }, []);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("email_verified");
    if (status === "success" || status === "invalid") setVerificationNotice(status);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (!authError) return;

    const messages: Record<string, string> = {
      oauth_invalid_request: "Yêu cầu đăng nhập không hợp lệ. Vui lòng thử lại.",
      oauth_state_expired: "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.",
      oauth_not_configured: "Đăng nhập Google chưa được cấu hình trên máy chủ.",
      oauth_token_failed: "Google không xác nhận được đăng nhập. Vui lòng thử lại.",
      oauth_profile_failed: "Không lấy được hồ sơ Google. Vui lòng thử lại.",
      oauth_email_unverified: "Tài khoản Google cần có email đã xác minh.",
      oauth_account_failed: "Không thể tạo tài khoản. Vui lòng thử lại.",
      oauth_failed: "Đăng nhập Google gặp lỗi. Vui lòng thử lại.",
    };
    setError(messages[authError] || "Đăng nhập Google thất bại. Vui lòng thử lại.");

    params.delete("auth_error");
    const query = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  // Nếu người dùng đã đăng nhập, tự động chuyển về trang chủ
  useEffect(() => {
    if (isAuthReady && currentUser) {
      router.replace("/");
    }
  }, [isAuthReady, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim() || !password.trim()) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let user: UserProfile;
      const email = account.includes("@") ? account.trim() : `${account.trim()}@haechivn.local`;

      if (isRegister) {
        if (!acceptedPolicies) throw new Error("Bạn cần đồng ý các điều khoản và chính sách trước khi tạo tài khoản.");
        const registration = await ApiClient.register(email, name.trim() || account.trim(), password, translationLanguage, acceptedPolicies);
        if (!registration.user) {
          setSuccess(registration.message || "Hãy kiểm tra email để xác minh tài khoản.");
          setIsRegister(false);
          setPassword("");
          return;
        }
        user = registration.user;
      } else {
        user = await ApiClient.login(email, password);
      }
      setCurrentUser(user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    ApiClient.loginWithGoogle(translationLanguage);
  };

  return (
    <div
      className="login-page-root min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 relative font-sans overflow-y-auto"
      style={{
        backgroundColor: "#020617",
        backgroundImage: "url('/images/login-bg.webp')",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay để ảnh nền sâu và không bị chói */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(2, 6, 23, 0.7)" }}
      />

      {/* Main Box - Khối nguyên khối màu không viền, đổ bóng sâu */}
      <div
        className="relative z-10 w-full max-w-5xl rounded-3xl shadow-2xl shadow-black/95 text-white overflow-hidden animate-fadeIn border-0"
        style={{ backgroundColor: "rgba(9, 15, 30, 0.95)" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">

          {/* Cột trái: Thương hiệu & Widget thẻ Anki nguyên khối không viền */}
          <div
            className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center space-y-8 border-0"
            style={{ backgroundColor: "#0b1329" }}
          >
            {/* Brand & Slogan */}
            <div className="space-y-3 text-center">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                Haechi<span className="text-blue-400">VN</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
                Trang học tiếng Hàn của người lười làm cho những người lười!
              </p>
            </div>

            {/* Widget Thẻ Anki - Căn giữa, không chữ rườm rà, nghĩa to rõ */}
            <div
              className="p-6 rounded-2xl shadow-lg max-w-sm mx-auto w-full text-center space-y-4 border-0"
              style={{ backgroundColor: "#111c38" }}
            >
              <div className="space-y-1 py-1">
                <div className="text-3xl font-black text-white tracking-tight">행복하다</div>
                <div className="text-base text-slate-300 font-semibold">Hạnh phúc</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-bold">
                <div
                  className="py-2.5 rounded-xl text-rose-300 text-center font-bold"
                  style={{ backgroundColor: "rgba(244, 63, 94, 0.2)" }}
                >
                  Quên
                </div>
                <div
                  className="py-2.5 rounded-xl text-emerald-300 text-center font-bold"
                  style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }}
                >
                  Nhớ
                </div>
              </div>
            </div>

            {/* Cửa vào cho khách: dùng thử trước, đăng ký khi muốn lưu tiến độ. */}
            <nav aria-label="Dùng thử không cần đăng nhập" className="flex flex-wrap justify-center gap-2 text-sm font-bold">
              <Link href="/placement-test" className="rounded-xl bg-blue-500/15 px-4 py-2.5 text-blue-200 transition hover:bg-blue-500/25">Kiểm tra trình độ</Link>
            </nav>
          </div>

          {/* Cột phải: Form Đăng nhập nguyên khối không viền */}
          <div
            className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center space-y-6 border-0"
            style={{ backgroundColor: "#070d1a" }}
          >
            {/* Tiêu đề căn giữa */}
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight text-white">
                {isRegister ? "Đăng ký tài khoản" : "Đăng nhập"}
              </h2>
            </div>

            {error && (
              <div
                className="p-3.5 rounded-xl text-rose-300 text-xs font-semibold animate-fadeIn text-center border-0"
                style={{ backgroundColor: "rgba(244, 63, 94, 0.2)" }}
              >
                {error}
              </div>
            )}
            {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center text-xs font-semibold text-emerald-300">{success}</div>}
            {verificationNotice === "success" && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center text-xs font-semibold text-emerald-300">Email đã được xác minh. Bạn có thể đăng nhập.</div>}
            {verificationNotice === "invalid" && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center text-xs font-semibold text-amber-300">Liên kết xác minh không hợp lệ hoặc đã hết hạn. Hãy đăng ký lại để nhận liên kết mới.</div>}

            {/* Form 2 dòng input nguyên khối không viền */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isRegister && (
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Họ và tên"
                    style={{ backgroundColor: "#132247", color: "#ffffff" }}
                    className="w-full px-4 py-3.5 rounded-xl text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner border-0"
                  />
                </div>
              )}

              {isRegister && <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-300">Bạn muốn học tiếng Hàn bằng ngôn ngữ nào?</span><select value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value as TranslationLanguage)} className="w-full rounded-xl px-4 py-3.5 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: "#132247" }}><option value="vi">Hàn – Việt</option><option value="en">Hàn – Anh</option><option value="ja">Hàn – Nhật</option></select></label>}

              {isRegister && <PolicyAcceptance checked={acceptedPolicies} onChange={setAcceptedPolicies} />}

              {/* Dòng 1: Tài khoản */}
              <div>
                <input
                  type={isRegister ? "email" : "text"}
                  required
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder={isRegister ? "Email để nhận liên kết xác minh" : "Tài khoản hoặc email"}
                  style={{ backgroundColor: "#132247", color: "#ffffff" }}
                  className="w-full px-4 py-3.5 rounded-xl text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner border-0"
                />
              </div>

              {/* Dòng 2: Mật khẩu */}
              <div>
                <input
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  style={{ backgroundColor: "#132247", color: "#ffffff" }}
                  className="w-full px-4 py-3.5 rounded-xl text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner border-0"
                />
              </div>

              {/* Nút Vào học */}
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                className="w-full py-3.5 rounded-xl hover:bg-blue-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-900/40 cursor-pointer transition-all flex items-center justify-center gap-2 mt-2 border-0"
              >
                {loading ? (
                  <span>Đang xử lý...</span>
                ) : isRegister ? (
                  <>
                    <UserPlus className="w-4 h-4 text-white" />
                    <span>Tạo tài khoản & Vào học</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Vào học</span>
                  </>
                )}
              </button>
            </form>

            {/* Phân cách Hoặc */}
            <div className="relative flex items-center justify-center py-1">
              <div className="w-full h-px bg-slate-800" />
              <span className="absolute px-3 bg-[#070d1a] text-[11px] font-bold text-slate-500 uppercase tracking-widest rounded-full">
                Hoặc
              </span>
            </div>

            {/* Vào học bằng tài khoản Google - nguyên khối không viền */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 rounded-xl bg-[#132247] hover:bg-[#1a2f60] text-slate-200 font-bold text-xs flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Vào học bằng tài khoản Google</span>
            </button>

            {/* Switch Đăng ký / Đăng nhập */}
            <div className="text-center pt-1">
              {isRegister ? (
                <p className="text-xs text-slate-400">
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(null); }}
                    className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 cursor-pointer ml-1"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setError(null); }}
                    className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 cursor-pointer ml-1"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
