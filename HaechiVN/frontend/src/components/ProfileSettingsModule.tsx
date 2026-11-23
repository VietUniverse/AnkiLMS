"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ImagePlus, LoaderCircle, LockKeyhole, Palette, Save, UserRound, Users } from "lucide-react";
import { useApp } from "../contexts/AppProvider";
import { TranslationLanguage, useTranslationLanguage } from "../lib/translationPreference";

type Reward = { id: string; name: string; description: string; icon: string; kind: "badge" | "frame" | "background"; visual: string };

// Bộ màu giao diện: id khớp với html[data-accent="<id>"] trong globals.css
const ACCENT_OPTIONS = [
  { id: "blue", label: "Xanh dương (mặc định)", colors: ["#0284c7", "#7dd3fc", "#e0f2fe", "#f8fafc"] },
  { id: "rose", label: "Hồng", colors: ["#e36a6a", "#ffb2b2", "#fff2d0", "#fffbf1"] },
  { id: "lavender", label: "Tím oải hương", colors: ["#9FA1FF", "#B5BAFF", "#AEE2FF", "#D9F9DF"] },
  { id: "moss", label: "Xanh rêu", colors: ["#1B211A", "#628141", "#8BAE66", "#EBD5AB"] },
];
const ACCENT_STORAGE_KEY = "haechivn_accent";

function applyAccent(id: string) {
  localStorage.setItem(ACCENT_STORAGE_KEY, id);
  if (id === "blue") delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = id;
}
type Equipped = { active_badge?: string | null; active_frame?: string | null; active_background?: string | null; gems?: number };

function saveLocalUser(user: Record<string, unknown>) {
  const stored = JSON.parse(localStorage.getItem("haechivn_user_profile") || "{}") as Record<string, unknown>;
  const updated = { ...stored, ...user };
  localStorage.setItem("haechivn_user_profile", JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("haechivn:user-updated", { detail: updated }));
}

export function ProfileSettingsModule() {
  const { currentUser, setCurrentUser } = useApp();
  const [name, setName] = useState(currentUser?.name || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [isPublic, setIsPublic] = useState(currentUser?.profile_public !== 0 && currentUser?.profile_public !== false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Equipped>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [translationLanguage, setTranslationLanguage] = useTranslationLanguage();
  const [accent, setAccent] = useState("blue");

  useEffect(() => {
    setAccent(localStorage.getItem(ACCENT_STORAGE_KEY) || "blue");
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void fetch("/api/rewards", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được vật phẩm.");
      if (!active) return;
      setRewards(data.rewards || []);
      setOwned((data.owned || []).map((item: { reward_id: string }) => item.reward_id));
      setEquipped(data.user || {});
    }).catch(() => { if (active) setMessage("Không tải được danh sách hiệu ứng. Bạn vẫn có thể lưu thông tin hồ sơ."); });
    return () => { active = false; };
  }, [currentUser?.id]);

  const avatar = currentUser?.avatar_url;
  const groupedRewards = useMemo(() => ({
    badge: rewards.filter((item) => item.kind === "badge" && owned.includes(item.id)),
    frame: rewards.filter((item) => item.kind === "frame" && owned.includes(item.id)),
    background: rewards.filter((item) => item.kind === "background" && owned.includes(item.id)),
  }), [rewards, owned]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile"); setMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, bio, profilePublic: isPublic, translationLanguage }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được hồ sơ.");
      setCurrentUser((previous) => ({ ...previous, ...data.user } as NonNullable<typeof previous>));
      saveLocalUser(data.user);
      setMessage("Đã lưu hồ sơ của bạn.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được hồ sơ."); }
    finally { setBusy(""); }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) { setMessage("Ảnh đại diện tối đa 2 MB."); return; }
    setBusy("avatar"); setMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": file.type }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được ảnh.");
      setCurrentUser((previous) => ({ ...previous, ...data.user } as NonNullable<typeof previous>));
      saveLocalUser(data.user);
      setMessage("Đã cập nhật ảnh đại diện.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được ảnh."); }
    finally { setBusy(""); }
  }

  async function equip(kind: "badge" | "frame" | "background", rewardId: string) {
    setBusy(kind); setMessage("");
    try {
      const response = await fetch("/api/rewards", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rewardId ? { action: "equip", rewardId } : { action: "unequip", slot: kind }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không đổi được hiệu ứng.");
      setEquipped((previous) => ({ ...previous, ...data.user }));
      setCurrentUser((previous) => ({ ...previous, ...data.user } as NonNullable<typeof previous>));
      saveLocalUser(data.user);
      setMessage("Đã cập nhật hiệu ứng hồ sơ.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không đổi được hiệu ứng."); }
    finally { setBusy(""); }
  }

  const effects: { key: "badge" | "frame" | "background"; title: string; current: string | null | undefined }[] = [
    { key: "badge", title: "Huy hiệu", current: equipped.active_badge },
    { key: "frame", title: "Khung ảnh đại diện", current: equipped.active_frame },
    { key: "background", title: "Ảnh nền hồ sơ", current: equipped.active_background },
  ];

  if (!currentUser) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          aria-label="Quay lại hồ sơ"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-bold text-slate-500">Tài khoản HaechiVN</p>
          <h1 className="text-xl font-black text-white">Cài đặt hồ sơ</h1>
        </div>
      </div>

      <form
        onSubmit={saveProfile}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1e3466] dark:bg-[#0f1b38] sm:p-6"
      >
        <section className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {avatar ? (
              <img src={avatar} alt="Ảnh đại diện hiện tại" className="h-full w-full object-cover" />
            ) : (
              currentUser.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-black text-white">Ảnh đại diện</h2>
            <p className="mt-1 text-[11px] font-semibold text-slate-700">JPG, PNG hoặc WebP, tối đa 2 MB</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200">
              {busy === "avatar" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Chọn ảnh
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  void uploadAvatar(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-700">Tên hiển thị</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={32}
              required
              minLength={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 dark:border-white/10 dark:bg-[#132247] dark:text-white"
              placeholder="Tên mọi người nhìn thấy"
            />
          </label>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-slate-700">Email tài khoản</span>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              {currentUser.email}
            </div>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="block text-[11px] font-bold text-slate-700">Ngôn ngữ nghĩa khi học tiếng Hàn</span>
          <select
            value={translationLanguage}
            onChange={(event) => setTranslationLanguage(event.target.value as TranslationLanguage)}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-600 dark:border-white/10 dark:bg-[#132247] dark:text-white"
          >
            <option value="vi">Hàn – Việt</option>
            <option value="en">Hàn – Anh</option>
            <option value="ja">Hàn – Nhật</option>
          </select>
          <span className="block text-[11px] font-semibold text-slate-700">
            Đồng bộ vào tài khoản và dùng chung Dictation, Shadowing cùng tra từ.
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="block text-[11px] font-bold text-slate-700">Giới thiệu bản thân</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={300}
            rows={4}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-sky-600 dark:border-white/10 dark:bg-[#132247] dark:text-white"
            placeholder="Chia sẻ đôi điều về hành trình học tiếng Hàn của bạn…"
          />
          <span className="block text-right text-[10px] font-bold text-slate-500">{bio.length}/300</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="h-5 w-5 accent-sky-600"
          />
          <span className="flex-1">
            <span className="flex items-center gap-2 text-xs font-black text-white">
              {isPublic ? <Users className="h-4 w-4 text-emerald-600" /> : <LockKeyhole className="h-4 w-4 text-amber-600" />}
              {isPublic ? "Cho phép mọi người xem hồ sơ" : "Hồ sơ riêng tư"}
            </span>
            <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-700">
              {isPublic
                ? "Hồ sơ và tiến độ tổng quan có thể được xem từ bảng xếp hạng."
                : "Chỉ bạn mới xem được hồ sơ và ảnh đại diện."}
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={busy === "profile"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
        >
          {busy === "profile" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu hồ sơ
        </button>
      </form>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1e3466] dark:bg-[#0f1b38] sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-white">
            <Palette className="h-4 w-4 text-slate-500" />
            Màu giao diện
          </h2>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-700">
            Đổi bộ màu nhấn của toàn app (nút, tab, chip, viền). Lựa chọn lưu trên thiết bị này.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCENT_OPTIONS.map((option) => {
            const active = accent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setAccent(option.id);
                  applyAccent(option.id);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-sky-600 bg-sky-50 dark:border-sky-500 dark:bg-sky-500/10"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-[#132247] dark:hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex gap-1">
                    {option.colors.map((color) => (
                      <span
                        key={color}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="text-xs font-black text-white">{option.label}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-sky-600" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#1e3466] dark:bg-[#0f1b38] sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-white">
            <UserRound className="h-4 w-4 text-slate-500" />
            Hiệu ứng trang cá nhân
          </h2>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-700">
            Trang bị những vật phẩm bạn đã đổi ở cửa hàng. Vật phẩm mới có thể mở khóa trong cửa hàng phần thưởng.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {effects.map((effect) => {
            const options = groupedRewards[effect.key];
            return (
              <label key={effect.key} className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-700">{effect.title}</span>
                <select
                  value={effect.current || ""}
                  disabled={busy === effect.key}
                  onChange={(event) => void equip(effect.key, event.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-sky-600 dark:border-white/10 dark:bg-[#132247] dark:text-white"
                >
                  <option value="">Không dùng</option>
                  {options.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.icon} {item.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
        <Link
          href="/rewards"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1e3466] dark:bg-[#0f1b38] dark:text-slate-200"
        >
          <UserRound className="h-4 w-4" />
          Tìm thêm khung và ảnh nền
        </Link>
      </section>

      {message && (
        <p
          role="status"
          className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-bold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200"
        >
          <Check className="mr-2 inline h-4 w-4" />
          {message}
        </p>
      )}
    </div>
  );
}
