"use client";

import React, { useState, useEffect } from "react";
import { X, User, Mail, Lock, UserPlus, LogIn, Sparkles } from "lucide-react";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { TranslationLanguage } from "../lib/translationPreference";

interface AuthModalProps {
  isOpen: boolean;
  initialRegisterMode?: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialRegisterMode = false,
  onClose,
  onSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(initialRegisterMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState<TranslationLanguage>("vi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsRegister(initialRegisterMode);
    setError(null);
  }, [initialRegisterMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Vui lòng điền đầy đủ Email và Mật khẩu");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let user: UserProfile;
      if (isRegister) {
        user = await ApiClient.register(email, name || email.split("@")[0], password, translationLanguage);
      } else {
        user = await ApiClient.login(email, password);
      }
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi xác thực. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    ApiClient.loginWithGoogle(translationLanguage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              {isRegister ? "Đăng Ký Tài Khoản HaechiVN" : "Đăng Nhập HaechiVN"}
            </h2>
            <p className="text-xs text-slate-400">Đồng bộ tiến độ học và tích lũy Streak/XP</p>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 shadow-md border border-slate-200 transition-all mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Đăng nhập nhanh bằng Google</span>
        </button>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative px-3 bg-slate-900 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            hoặc qua Email
          </span>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Tên hiển thị:</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên hiển thị của bạn..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {isRegister && <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Ngôn ngữ dịch khi học</span><select value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value as TranslationLanguage)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs text-white outline-none focus:border-blue-500"><option value="vi">Hàn – Việt</option><option value="en">Hàn – Anh</option><option value="ja">Hàn – Nhật</option></select></label>}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Địa chỉ Email:</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nhap-email@domain.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Mật khẩu:</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                  minLength={isRegister ? 8 : undefined}
                  maxLength={128}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
              {isRegister && <p className="mt-1.5 text-[11px] text-slate-500">Mật khẩu cần ít nhất 8 ký tự.</p>}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full btn-duo ${
              isRegister ? "btn-duo-success" : "btn-duo-primary"
            } py-3 text-xs flex items-center justify-center gap-2 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>
              {loading
                ? "Đang xử lý..."
                : isRegister
                ? "Tạo Tài Khoản Mới"
                : "Đăng Nhập Ngay"}
            </span>
          </button>
        </form>

        {/* Toggle Register / Login */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-blue-400 font-bold hover:underline"
          >
            {isRegister ? "Đăng nhập ngay" : "Đăng ký tài khoản mới"}
          </button>
        </div>
      </div>
    </div>
  );
};
