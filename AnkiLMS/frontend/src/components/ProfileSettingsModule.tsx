"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ImagePlus, LoaderCircle, LockKeyhole, Palette, Save, UserRound, Users } from "lucide-react";
import { useApp } from "../contexts/AppProvider";

type Reward = { id: string; name: string; description: string; icon: string; kind: "badge" | "frame" | "background"; visual: string };
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
      const response = await fetch("/api/profile", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, bio, profilePublic: isPublic }) });
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

  return <div className="mx-auto max-w-3xl space-y-5 pb-24">
    <div className="flex items-center gap-3"><Link href="/profile" aria-label="Quay lại hồ sơ" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200"><ArrowLeft className="h-4 w-4" /></Link><div><p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Tài khoản HaechiVN</p><h1 className="text-xl font-black text-white sm:text-2xl">Cài đặt hồ sơ</h1></div></div>

    <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <section className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-2xl font-black text-white">{avatar ? <img src={avatar} alt="Ảnh đại diện hiện tại" className="h-full w-full object-cover" /> : currentUser.name.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><h2 className="font-bold text-white">Ảnh đại diện</h2><p className="mt-1 text-xs text-slate-400">JPG, PNG hoặc WebP · tối đa 2 MB</p><label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 text-xs font-bold text-sky-200 hover:bg-sky-500/20">{busy === "avatar" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-bold text-slate-300">Tên hiển thị</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} required minLength={2} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-sky-400" placeholder="Tên mọi người nhìn thấy" /></label><div className="space-y-1.5"><span className="text-xs font-bold text-slate-300">Email tài khoản</span><div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-400">{currentUser.email}</div></div></div>
      <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-300">Giới thiệu bản thân</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={4} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-sky-400" placeholder="Chia sẻ đôi điều về hành trình học tiếng Hàn của bạn…" /><span className="block text-right text-[10px] text-slate-500">{bio.length}/300</span></label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-5 w-5 accent-sky-500" /><span className="flex-1"><span className="flex items-center gap-2 text-xs font-bold text-white">{isPublic ? <Users className="h-4 w-4 text-emerald-300" /> : <LockKeyhole className="h-4 w-4 text-amber-300" />}{isPublic ? "Cho phép mọi người xem hồ sơ" : "Hồ sơ riêng tư"}</span><span className="mt-1 block text-[11px] leading-5 text-slate-400">{isPublic ? "Hồ sơ và tiến độ tổng quan có thể được xem từ bảng xếp hạng." : "Chỉ bạn mới xem được hồ sơ và ảnh đại diện."}</span></span></label>
      <button type="submit" disabled={busy === "profile"} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-black text-white hover:bg-sky-500 disabled:opacity-60">{busy === "profile" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Lưu hồ sơ</button>
    </form>

    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-fuchsia-400/10 p-2 text-fuchsia-200"><Palette className="h-5 w-5" /></div><div><h2 className="font-black text-white">Hiệu ứng trang cá nhân</h2><p className="mt-1 text-xs leading-5 text-slate-400">Trang bị những vật phẩm bạn đã đổi ở cửa hàng. Vật phẩm mới có thể mở khóa trong cửa hàng phần thưởng.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-3">{effects.map((effect) => { const options = groupedRewards[effect.key]; return <label key={effect.key} className="space-y-1.5"><span className="text-xs font-bold text-slate-300">{effect.title}</span><select value={effect.current || ""} disabled={busy === effect.key} onChange={(event) => void equip(effect.key, event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs text-white outline-none focus:border-fuchsia-400"><option value="">Không dùng</option>{options.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</select></label>; })}</div>
      <Link href="/rewards" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 text-xs font-bold text-fuchsia-100 hover:bg-fuchsia-300/20"><UserRound className="h-4 w-4" />Tìm thêm khung và ảnh nền</Link>
    </section>
    {message && <p role="status" className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-sky-100"><Check className="mr-2 inline h-4 w-4" />{message}</p>}
  </div>;
}
