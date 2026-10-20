"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  KeyRound,
  BookOpen,
  Trophy,
  CheckCircle2,
  Copy,
  UserCheck,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Layers,
  Clock,
  UserPlus,
  ShieldAlert,
  Trash2,
  ChevronLeft,
  XCircle,
  Award,
  Flame,
  Zap,
  Lock,
  Crown,
  GraduationCap,
  Settings,
  UserCheck2,
} from "lucide-react";
import { ApiClient, UserProfile } from "../lib/apiClient";
import { useApp } from "../contexts/AppProvider";
import Link from "next/link";
import { THTH_DECKS } from "../data/ththDecks";
import { AnkiDeck, AnkiParser } from "../lib/ankiParser";

export interface ClassMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "staff" | "student";
  status: "approved" | "pending";
  joinedAt: string;
  xp: number;
  streak: number;
  completedAssignments?: string[];
}

export interface StudentAssignmentProgress {
  studentId: string;
  studentName: string;
  reviewedCards: number;
  totalCards: number;
  correctCards: number;
  lastStudiedAt: string | null;
  completed: boolean;
}

export interface ClassAssignment {
  id: string;
  title: string;
  deckName: string;
  dueDate: string;
  assignedBy: string;
  completed?: boolean;
  totalCards?: number;
  reviewedCards?: number;
  correctCards?: number;
  lastStudiedAt?: string | null;
  progress?: StudentAssignmentProgress[];
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  members: ClassMember[];
  assignments: ClassAssignment[];
}

interface ClassroomModuleProps {
  currentUser: UserProfile | null;
}

export const ClassroomModule: React.FC<ClassroomModuleProps> = ({ currentUser }) => {
  const { handleOpenAuth, userDecks } = useApp();

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Join Class Form State
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Class Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");

  // Assign Deck Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDeckId, setAssignDeckId] = useState(`builtin:${THTH_DECKS[0]?.id || ""}`);
  const [uploadedAssignmentDecks, setUploadedAssignmentDecks] = useState<AnkiDeck[]>([]);
  const [parsingAssignmentApkg, setParsingAssignmentApkg] = useState(false);
  const [assignDueDate, setAssignDueDate] = useState("");

  // Detail View Active Tab
  const [activeTab, setActiveTab] = useState<"assignments" | "leaderboard" | "members">("assignments");

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const assignmentDecks = [
    ...THTH_DECKS.map((deck) => ({ id: `builtin:${deck.id}`, name: deck.name.replaceAll("::", " · "), mediaAssets: [], cards: deck.cards.map((card) => ({
      id: Number(card.id), korean: String(card.word || "").replace(/<[^>]*>/g, "").trim(),
      meaning: String(card.meaning || "").replace(/<[^>]*>/g, "").trim(),
      example: String(card.example || "").replace(/<[^>]*>/g, "").trim(), pronunciation: card.transliteration || "",
      mediaRefs: [] as string[],
    })) })),
    ...userDecks.map((deck) => ({ id: `anki:${deck.id}`, name: `Anki · ${deck.name}`, mediaAssets: deck.mediaAssets || [], cards: deck.cards.map((card) => ({
      id: Number(card.id), korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, "").trim(),
      meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, "").trim(),
      example: (card.exampleSentence || "").replace(/<[^>]*>/g, "").trim(), pronunciation: card.romanization || "",
      mediaRefs: card.mediaRefs || [],
    })) })),
    ...uploadedAssignmentDecks.map((deck) => ({ id: `upload:${deck.id}`, name: `Anki · ${deck.name}`, mediaAssets: deck.mediaAssets || [], cards: deck.cards.map((card) => ({
      id: Number(card.id), korean: (card.koreanText || card.frontText || "").replace(/<[^>]*>/g, "").trim(),
      meaning: (card.vietnameseMeaning || card.backText || "").replace(/<[^>]*>/g, "").trim(),
      example: (card.exampleSentence || "").replace(/<[^>]*>/g, "").trim(), pronunciation: card.romanization || "",
      mediaRefs: card.mediaRefs || [],
    })) })),
  ].filter((deck) => deck.cards.length > 0);
  const selectedAssignmentDeck = assignmentDecks.find((deck) => deck.id === assignDeckId) || assignmentDecks[0];

  // Classes are shared server-side so teachers and learners see the same state.
  useEffect(() => {
    let active = true;
    if (!currentUser) {
      setClasses([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    ApiClient.getClasses().then((result) => {
      if (active) setClasses(result);
    }).catch((error) => {
      if (active) setMsg({ type: "error", text: error.message || "Không tải được lớp học." });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  const runClassAction = async (payload: Record<string, unknown>) => {
    try {
      setClasses(await ApiClient.classAction(payload));
      return true;
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu thay đổi." });
      return false;
    }
  };

  // 1. Submit Join Request by Code
  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }

    const trimmedCode = joinCodeInput.trim().toUpperCase();
    if (!trimmedCode) {
      setMsg({ type: "error", text: "Vui lòng nhập mã lớp học!" });
      return;
    }

    const joined = await runClassAction({ action: "join", code: trimmedCode });
    if (!joined) return;
    setJoinCodeInput("");
    setMsg({ type: "success", text: "Đã gửi yêu cầu tham gia lớp. Chủ lớp sẽ duyệt yêu cầu của bạn." });
  };

  // 2. Create Private Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!currentUser) {
      handleOpenAuth(false);
      return;
    }

    if (!newClassName.trim()) return;

    const created = await runClassAction({ action: "create", name: newClassName, description: newClassDesc });
    if (!created) return;
    setShowCreateModal(false);
    setNewClassName("");
    setNewClassDesc("");
    setMsg({
      type: "success",
      text: "Tạo lớp học thành công. Mã mời nằm trong trang lớp để bạn sao chép và gửi cho học viên.",
    });
  };

  // 3. Approve Member
  const handleApproveMember = (classId: string, memberId: string) => {
    void runClassAction({ action: "approve", classId, memberId });
  };

  // 4. Reject / Kick Member
  const handleRemoveMember = (classId: string, memberId: string) => {
    void runClassAction({ action: "remove", classId, memberId });
  };

  // 5. Change Role (Student <-> Admin)
  const handleChangeRole = (classId: string, memberId: string, newRole: "admin" | "staff" | "student") => {
    void runClassAction({ action: "role", classId, memberId, role: newRole });
  };

  // 6. Assign New Deck / Assignment
  const handleAssignDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !assignTitle.trim()) return;

    if (!selectedAssignmentDeck?.cards.length) {
      setMsg({ type: "error", text: "Bộ thẻ này không có thẻ hợp lệ để giao." });
      return;
    }
    const cards = selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).slice(0, 500);
    const referencedFilenames = new Set(cards.flatMap((card) => card.mediaRefs || []));
    const sourceAssets = [...new Map((selectedAssignmentDeck.mediaAssets || [])
      .filter((asset) => referencedFilenames.has(asset.filename))
      .map((asset) => [asset.filename, asset])).values()];
    if (referencedFilenames.size && sourceAssets.length !== referencedFilenames.size) {
      setMsg({ type: "error", text: "Bộ thẻ có media cục bộ đã hết phiên. Hãy tải lại file .apkg tại đây để chia sẻ đủ ảnh và âm thanh." });
      return;
    }
    const assetIds = new Map(sourceAssets.map((asset) => [asset.filename, crypto.randomUUID().replace(/-/g, "")]));
    const mediaAssets = sourceAssets.map((asset) => ({
      id: assetIds.get(asset.filename)!, filename: asset.filename, contentType: asset.contentType, size: asset.blob.size,
    }));
    if (mediaAssets.reduce((sum, asset) => sum + asset.size, 0) > 60_000_000) {
      setMsg({ type: "error", text: "Tổng dung lượng ảnh và âm thanh tối đa 60 MB cho mỗi bài tập." });
      return;
    }
    const assignmentId = `asg_${crypto.randomUUID().replace(/-/g, "")}`;
    const deckCards = cards.map((card) => ({
      ...card,
      mediaAssetIds: (card.mediaRefs || []).map((filename) => assetIds.get(filename)).filter((id): id is string => !!id),
    }));
    const dueDate = assignDueDate || (() => {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    })();
    const saved = await runClassAction({ action: "assignment", classId: selectedClassId, assignmentId, title: assignTitle, deckName: selectedAssignmentDeck.name, dueDate, deckCards, mediaAssets });
    if (!saved) return;
    try {
      for (let index = 0; index < sourceAssets.length; index += 8) {
        await Promise.all(sourceAssets.slice(index, index + 8).map((asset) => ApiClient.uploadClassAssignmentMedia(selectedClassId, assignmentId, assetIds.get(asset.filename)!, asset.blob, asset.contentType)));
      }
    } catch (error) {
      const wasRemoved = await ApiClient.classAction({ action: "delete_assignment", classId: selectedClassId, assignmentId }).then(() => true).catch(() => false);
      setClasses(await ApiClient.getClasses().catch(() => classes));
      setMsg({ type: "error", text: error instanceof Error ? `${error.message} ${wasRemoved ? "Bài giao lỗi đã được gỡ bỏ." : "Không xác nhận được việc gỡ bài; hãy kiểm tra lại danh sách bài tập."}` : "Không tải được media lên Cloudflare." });
      return;
    }
    if (sourceAssets.length) setClasses(await ApiClient.getClasses().catch(() => classes));
    setShowAssignModal(false);
    setAssignTitle("");
  };

  const handleAssignmentApkgUpload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apkg")) {
      setMsg({ type: "error", text: "Vui lòng chọn file .apkg." });
      return;
    }
    setParsingAssignmentApkg(true);
    setMsg(null);
    try {
      const decks = await AnkiParser.parseApkg(file);
      const uniqueDecks = decks.map((deck) => ({ ...deck, id: `${Date.now()}_${deck.id}` }));
      setUploadedAssignmentDecks((prev) => [...prev, ...uniqueDecks]);
      if (uniqueDecks[0]) setAssignDeckId(`upload:${uniqueDecks[0].id}`);
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Không đọc được file Anki." });
    } finally {
      setParsingAssignmentApkg(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const myClasses = currentUser
    ? classes.filter((c) =>
        c.members.some((m) => m.id === currentUser.id || m.email === currentUser.email)
      )
    : [];

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const myMemberRecord = selectedClass?.members.find(
    (m) => m.id === currentUser?.id || m.email === currentUser?.email
  );
  const canManageClass = myMemberRecord?.role === "owner" || myMemberRecord?.role === "admin" || myMemberRecord?.role === "staff";
  const isClassOwner = myMemberRecord?.role === "owner";

  // =========================================================================
  // VIEW MODE: CLASSROOM DETAIL SCREEN
  // =========================================================================
  if (selectedClass) {
    const pendingMembers = selectedClass.members.filter((m) => m.status === "pending");
    const approvedMembers = selectedClass.members
      .filter((m) => m.status === "approved")
      .sort((a, b) => b.xp - a.xp);

    const myCompletedCount = myMemberRecord?.completedAssignments?.length || 0;
    const totalAssignments = selectedClass.assignments.length;
    const myProgressPercent = totalAssignments > 0 ? Math.round((myCompletedCount / totalAssignments) * 100) : 0;

    return (
      <div className="space-y-6 animate-fadeIn pb-24 max-w-5xl mx-auto select-none">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between bg-[#0f1b38] border border-[#1e3466] p-4 rounded-2xl shadow-xl">
          <button
            onClick={() => setSelectedClassId(null)}
            className="px-4 py-2 rounded-xl bg-[#132247] hover:bg-[#1a2d5c] text-sky-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-sky-500/30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Danh Sách Lớp Học</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-xs font-mono font-bold flex items-center gap-2">
              <span>Mã Lớp: {selectedClass.code}</span>
              <button onClick={() => copyToClipboard(selectedClass.code)} className="hover:text-white" title="Sao chép mã">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        </div>

        {/* =========================================================================
            HEADER BANNER TYPE 1: OWNER & ADMIN INTERFACE (GOLD ROYAL MANAGEMENT THEME)
           ========================================================================= */}
        {canManageClass ? (
          <div className="card-duo p-6 md:p-8 bg-gradient-to-r from-amber-950/70 via-slate-900 to-purple-950/70 border-2 border-amber-500/50 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-amber-500/30 pb-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 text-xs font-extrabold shadow-md">
                <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>BẢNG ĐIỀU HÀNH NHÂN SỰ LỚP HỌC</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-purple-950 border border-purple-500/50 text-purple-300 text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Quyền Hạn: {myMemberRecord?.role === "owner" ? "Giáo viên chủ lớp" : myMemberRecord?.role === "admin" ? "Quản trị viên lớp" : "Giáo vụ"}</span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-white">{selectedClass.name}</h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {selectedClass.description}
              </p>
            </div>

            {/* Quick Admin Control Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 fill-slate-950" />
                <span>+ Giao Bộ Thẻ / Bài Tập Mới</span>
              </button>

              <button
                onClick={() => setActiveTab("members")}
                className="px-4 py-2.5 rounded-xl bg-purple-600/30 border border-purple-500/50 hover:bg-purple-600/50 text-purple-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <UserCheck2 className="w-4 h-4 text-purple-400" />
                <span>Duyệt Học Viên & Phân Quyền ({pendingMembers.length} chờ)</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             HEADER BANNER TYPE 2: STUDENT INTERFACE (EMERALD OCEAN LEARNING THEME)
             ========================================================================= */
          <div className="card-duo p-6 md:p-8 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-sky-950/70 border-2 border-emerald-500/40 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-emerald-500/30 pb-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-xs font-extrabold shadow-md">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>GIAO DIỆN HỌC VIÊN LỚP HỌC</span>
              </div>

              <div className="px-3 py-1 rounded-xl bg-sky-950 border border-sky-500/40 text-sky-300 text-xs font-bold">
                Chủ lớp: {selectedClass.ownerName}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-white">{selectedClass.name}</h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {selectedClass.description}
              </p>
            </div>

            {/* Student Personal Progress Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Bài tập đã hoàn thành</span>
                  <span className="text-sm font-black text-emerald-400">
                    {myCompletedCount} / {totalAssignments} ({myProgressPercent}%)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                  <Flame className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Chuỗi Streak Lớp</span>
                  <span className="text-sm font-black text-amber-400">{myMemberRecord?.streak || 0} ngày</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5 fill-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Điểm XP Đóng Góp</span>
                  <span className="text-sm font-black text-blue-400">{myMemberRecord?.xp || 0} XP</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Class Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "assignments" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{canManageClass ? "Quản Lý Bài Tập Đã Giao" : "Bài Tập Của Tôi"} ({selectedClass.assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "leaderboard" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Bảng Xếp Hạng Lớp ({approvedMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "members" ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{canManageClass ? "Quản Lý Thành Viên & Duyệt Request" : "Danh Sách Bạn Học"}</span>
            {canManageClass && pendingMembers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {pendingMembers.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: ASSIGNMENTS / DECKS */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>{canManageClass ? "Danh Sách Bài Tập & Bộ Thẻ Quản Lý" : "Bài Tập Được Giao Dành Cho Bạn"}</span>
              </h3>

              {canManageClass && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Giao Bộ Thẻ Mới</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedClass.assignments.map((asg) => {
                const isCompletedByMe = myMemberRecord?.completedAssignments?.includes(asg.id);

                return (
                  <div key={asg.id} className="card-duo p-5 bg-[#0f1b38] border-[#1e3466] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300 text-[10px] font-black">
                          📙 {asg.deckName}
                        </span>

                        <span className="px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-black flex items-center gap-1">
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Bộ thẻ của lớp</span>
                        </span>

                        {isCompletedByMe && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Đã nộp bài</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-white">{asg.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Hạn nộp: <strong className="text-amber-400">{asg.dueDate}</strong>
                      </p>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
                        {canManageClass ? <>
                          <p className="mb-2 font-bold text-slate-300">Tiến độ học sinh · {asg.totalCards || 0} thẻ trong bộ</p>
                          {approvedMembers.filter((member) => member.role === "student").length ? <div className="space-y-2">
                            {approvedMembers.filter((member) => member.role === "student").map((member) => {
                              const progress = asg.progress?.find((item) => item.studentId === member.id);
                              const reviewed = progress?.reviewedCards || 0;
                              const total = progress?.totalCards || asg.totalCards || 0;
                              const percent = total ? Math.min(100, Math.round(reviewed / total * 100)) : 0;
                              return <div key={member.id} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-slate-400"><span className="truncate text-slate-200">{member.name}</span><span className="shrink-0">{reviewed}/{total} · {progress?.correctCards || 0} đúng</span></div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} /></div>
                                <p className="text-[10px] text-slate-500">{progress?.lastStudiedAt ? `Học gần nhất: ${progress.lastStudiedAt}` : "Chưa bắt đầu"}{progress?.completed ? " · Hoàn thành" : ""}</p>
                              </div>;
                            })}
                          </div> : <p className="text-slate-500">Chưa có học sinh trong lớp.</p>}
                        </> : <>
                          <p className="font-bold text-slate-300">Tiến độ của bạn: {asg.reviewedCards || 0}/{asg.totalCards || 0} thẻ đã ôn</p>
                          <p className="mt-1 text-[10px] text-slate-500">{asg.lastStudiedAt ? `Học gần nhất: ${asg.lastStudiedAt}` : "Bắt đầu học để lưu tiến độ"}</p>
                        </>}
                      </div>
                      
                      <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Bộ thẻ được chia sẻ với thành viên lớp để học trực tiếp và ghi nhận tiến độ trên HaechiVN.</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">Giao bởi: {asg.assignedBy}</span>
                      <Link
                        href={`/flashcards?assignment=${encodeURIComponent(asg.id)}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <span>{isCompletedByMe ? "Ôn Lại Bộ Thẻ" : "Vào Ôn Thẻ Ngay"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CLASS LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <div className="card-duo bg-[#0f1b38] border-[#1e3466] overflow-hidden">
            <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 flex justify-between">
              <span>Hạng & Thành viên lớp</span>
              <span>Thành tích Lớp</span>
            </div>
            <div className="divide-y divide-slate-800/60">
              {approvedMembers.map((member, idx) => (
                <div key={member.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-900/60">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl font-mono font-black text-xs flex items-center justify-center ${
                      idx === 0 ? "bg-amber-400 text-slate-950" : idx === 1 ? "bg-slate-300 text-slate-950" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {member.role === "owner" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">Chủ lớp</span>
                        )}
                        {member.role === "admin" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold">Quản trị viên</span>
                        )}
                        {member.role === "staff" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-bold">Giáo vụ</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{member.completedAssignments?.length || 0}/{selectedClass.assignments.length} Bài tập</span>
                    </span>
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" /> {member.streak} ngày
                    </span>
                    <span className="text-xs font-black text-blue-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-blue-400" /> {member.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEMBER MANAGEMENT / LIST */}
        {activeTab === "members" && (
          <div className="space-y-6">
            {/* Pending Requests Section (Admins/Owner Only) */}
            {canManageClass && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Danh Sách Xin Vào Lớp Chờ Duyệt ({pendingMembers.length})</span>
                </h3>

                {pendingMembers.length > 0 ? (
                  <div className="space-y-2">
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="card-duo p-4 bg-[#132247] border border-amber-500/40 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black text-white">{member.name}</p>
                          <p className="text-[11px] text-slate-400">{member.email} · Xin vào ngày {member.joinedAt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveMember(selectedClass.id, member.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Phê Duyệt</span>
                          </button>
                          <button
                            onClick={() => handleRemoveMember(selectedClass.id, member.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/30 text-rose-300 font-bold text-xs hover:bg-rose-600/50 cursor-pointer"
                          >
                            Từ Chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-900/40 p-3 rounded-xl">Không có yêu cầu tham gia nào đang chờ duyệt.</p>
                )}
              </div>
            )}

            {/* Approved Members List */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Danh Sách Thành Viên Lớp ({approvedMembers.length})</span>
              </h3>

              <div className="card-duo bg-[#0f1b38] border-[#1e3466] divide-y divide-slate-800">
                {approvedMembers.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-2">
                        <span>{member.name}</span>
                        {member.role === "owner" && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">Chủ Lớp</span>}
                        {member.role === "admin" && <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500 text-white font-bold">Quản trị viên</span>}
                        {member.role === "staff" && <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-bold">Giáo vụ</span>}
                      </p>
                      <p className="text-[11px] text-slate-400">{member.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isClassOwner && member.role !== "owner" ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(selectedClass.id, member.id, e.target.value as "admin" | "staff" | "student")}
                            className="px-2.5 py-1 rounded-xl bg-[#132247] border border-[#1e3a70] text-xs font-bold text-white focus:outline-none"
                          >
                            <option value="student">Học sinh</option>
                            <option value="staff">Giáo vụ</option>
                            <option value="admin">Quản trị viên</option>
                          </select>

                          <button
                            onClick={() => handleRemoveMember(selectedClass.id, member.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40"
                            title="Xóa khỏi lớp"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : canManageClass && myMemberRecord?.role !== "staff" && member.role !== "owner" ? (
                        <button onClick={() => handleRemoveMember(selectedClass.id, member.id)} className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40" title="Xóa khỏi lớp"><Trash2 className="w-4 h-4" /></button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{member.role === "owner" ? "Giáo viên chủ lớp" : member.role === "admin" ? "Quản trị viên" : member.role === "staff" ? "Giáo vụ" : "Học sinh"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Assign Deck */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>Giao Bài Tập & Bộ Thẻ Mới</span>
              </h3>

              <form onSubmit={handleAssignDeck} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tiêu Đề Bài Tập *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Ôn tập Từ vựng Bài 01 - 03"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Chọn Bộ Thẻ Anki</label>
                  <select
                    value={selectedAssignmentDeck?.id || ""}
                    onChange={(e) => setAssignDeckId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  >
                    {assignmentDecks.map((deck) => (
                      <option key={deck.id} value={deck.id} disabled={deck.cards.filter((card) => card.korean && card.meaning).length === 0 || deck.cards.filter((card) => card.korean && card.meaning).length > 500}>
                        {deck.name} · {deck.cards.filter((card) => card.korean && card.meaning).length} thẻ
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[10px] leading-4 text-slate-500">Tải file .apkg tại đây để đính kèm ảnh và âm thanh cho học sinh. Media được lưu riêng theo bài trên Cloudflare; tối đa 500 thẻ và 60 MB media mỗi bài.</p>
                </div>

                <label className="block rounded-xl border border-dashed border-sky-500/40 bg-sky-950/20 p-3 text-center text-xs font-bold text-sky-200 cursor-pointer hover:bg-sky-900/30">
                  <input type="file" accept=".apkg,application/zip" className="hidden" disabled={parsingAssignmentApkg} onChange={(event) => { void handleAssignmentApkgUpload(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                  {parsingAssignmentApkg ? "Đang giải nén .apkg…" : "Tải .apkg lên để chia sẻ kèm hình ảnh và âm thanh"}
                </label>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hạn Nộp (Hạn Ôn)</label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={parsingAssignmentApkg || !selectedAssignmentDeck || selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).length === 0 || selectedAssignmentDeck.cards.filter((card) => card.korean && card.meaning).length > 500}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Giao Cho Lớp
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MAIN VIEW: CLASSROOM DASHBOARD & MY CLASSES LIST
  // =========================================================================
  return (
    <div className="space-y-8 animate-fadeIn pb-24 max-w-5xl mx-auto select-none">
      {/* Banner Top */}
      <div className="card-duo p-6 md:p-8 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-blue-500/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-3 z-10 text-center md:text-left flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 text-xs font-bold">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Lớp Học Trực Tuyến & Nhóm Ôn Thẻ Riêng Tư</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">
            Tham Gia Lớp Học <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">Bằng Mã Kích Hoạt</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
            Nhập Mã lớp do Chủ lớp/Giáo viên cấp để gửi yêu cầu tham gia. Sau khi được phê duyệt, bạn có thể học bộ thẻ riêng và đua top bảng xếp hạng lớp.
          </p>
        </div>

        <button
          onClick={() => (currentUser ? setShowCreateModal(true) : handleOpenAuth(false))}
          className="btn-duo btn-duo-primary px-6 py-3 text-xs flex items-center gap-2 shrink-0 shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>Tạo Lớp Học Mới</span>
        </button>
      </div>

      {/* Join Class by Code Card */}
      <div className="card-duo p-6 bg-[#0f1b38] border-[#1e3466] space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Gửi Yêu Cầu Xin Vào Lớp</h2>
            <p className="text-xs text-slate-400">Nhập mã kích hoạt lớp (Ví dụ: HAECHI-8492) để gửi yêu cầu cho Chủ lớp phê duyệt</p>
          </div>
        </div>

        <form onSubmit={handleJoinRequest} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <KeyRound className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nhập mã kích hoạt lớp"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#132247] border border-[#1e3a70] text-white font-mono font-bold uppercase text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Gửi Yêu Cầu Xin Vào Lớp</span>
          </button>
        </form>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              msg.type === "success"
                ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-300"
                : "bg-rose-950/60 border border-rose-500/50 text-rose-300"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}
      </div>

      {/* List of My Classes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Lớp Học Của Tôi ({myClasses.length})</h2>
              <span className="text-xs text-slate-400">Các lớp học bạn đã tạo hoặc đăng ký tham gia</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-duo p-8 text-center text-sm text-slate-400">Đang tải lớp học…</div>
        ) : myClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myClasses.map((cls) => {
              const memberRecord = cls.members.find(
                (m) => m.id === currentUser?.id || m.email === currentUser?.email
              );
              const isApproved = memberRecord?.status === "approved";
              const canManageClassRole = memberRecord?.role === "owner" || memberRecord?.role === "admin" || memberRecord?.role === "staff";

              return (
                <div
                  key={cls.id}
                  className={`card-duo p-6 bg-[#0f1b38] border-[#1e3466] space-y-4 flex flex-col justify-between transition-all cursor-pointer ${
                    isApproved ? "border-l-4 border-l-emerald-400 hover:border-emerald-500/60" : "opacity-80"
                  }`}
                  onClick={() => isApproved && setSelectedClassId(cls.id)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl bg-[#132247] border border-[#1e3a70] font-mono text-xs font-black text-sky-400 flex items-center gap-1.5">
                        <span>Mã: {cls.code}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(cls.code);
                          }}
                          className="hover:text-white"
                          title="Sao chép mã"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </span>

                      {isApproved ? (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border ${
                          canManageClassRole ? "bg-amber-950/80 border-amber-500/50 text-amber-300" : "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                        }`}>
                          {canManageClassRole ? <Crown className="w-3 h-3 text-amber-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          <span>{canManageClassRole ? memberRecord?.role === "owner" ? "Giáo viên chủ lớp" : memberRecord?.role === "admin" ? "Quản trị viên lớp" : "Giáo vụ" : "Học Viên"}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>⏳ Đang chờ Chủ lớp duyệt</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-black text-white">{cls.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cls.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-slate-300">
                        <UserCheck className="w-4 h-4 text-blue-400" /> {cls.ownerName}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Users className="w-4 h-4" /> {cls.members.filter((m) => m.status === "approved").length} Thành viên
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <Layers className="w-4 h-4" /> {cls.assignments.length} Bài tập
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">Ngày tạo: {cls.createdAt}</span>
                    {isApproved ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClassId(cls.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all ${
                          canManageClassRole ? "bg-amber-600 hover:bg-amber-500" : "bg-blue-600 hover:bg-blue-500"
                        }`}
                      >
                        <span>{canManageClassRole ? "Bảng Quản Lý" : "Vào Chi Tiết Lớp"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs text-amber-400 font-bold italic">Chờ phê duyệt</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-duo p-8 text-center bg-[#0f1b38] border-[#1e3466] border-dashed space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto font-black text-xl">
              🏫
            </div>
            <h3 className="text-base font-black text-white">Bạn Chưa Tham Gia Lớp Học Nào</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Hãy nhập Mã kích hoạt lớp ở ô trên để gửi yêu cầu xin vào lớp, hoặc tự Tạo một lớp học mới cho nhóm của bạn!
            </p>
            <button
              onClick={() => (currentUser ? setShowCreateModal(true) : handleOpenAuth(false))}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lớp Học Mới Ngay</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create Class */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-duo p-6 bg-[#0f1b38] border-[#1e3466] max-w-md w-full space-y-4 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Tạo Lớp Học Riêng Tư Mới</span>
            </h3>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tên Lớp Học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lớp Hàn Ngữ AnkiVN K101"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Mô tả Lớp Học</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả mục tiêu học tập, lịch ôn luyện..."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#132247] border border-[#1e3a70] text-white text-xs font-bold focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Tạo Lớp & Sinh Mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
