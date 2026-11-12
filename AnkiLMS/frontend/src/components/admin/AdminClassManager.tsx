"use client";

import React, { FormEvent, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

export type AdminClassRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  members: number;
  assignments: number;
};

type ClassMember = {
  role: string;
  joinedAt: string;
  userId: string;
  name: string;
  email: string;
  xp: number;
  streak: number;
  siteRole: string;
};

type ClassAssignment = {
  id: string;
  deckId: string;
  title: string;
  description: string;
  cardCount: number;
  dueDate: string | null;
  createdAt: string;
  completedMembers: number;
};

type ClassDetailResponse = {
  class: {
    id: string;
    code: string;
    name: string;
    description: string;
    ownerId: string;
    createdAt: string;
  };
  members: ClassMember[];
  assignments: ClassAssignment[];
};

type Props = {
  classes: AdminClassRow[];
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  onError: (msg: string) => void;
  onSuccess?: (msg: string) => void;
  onRefresh: () => void;
  onOpenThthPanel?: () => void;
};

const fieldCls =
  "w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner";
const selectCls =
  "rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
const labelCls = "block text-xs font-bold text-stone-700 dark:text-slate-300";
const ghostBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-100 hover:bg-stone-200 dark:bg-[#132247] dark:hover:bg-[#1a2f60] px-3 py-2 text-xs font-bold text-stone-700 dark:text-slate-200 transition-colors cursor-pointer";
const dangerBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-700/50 bg-rose-50/50 hover:bg-rose-100 dark:bg-transparent dark:hover:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

export function AdminClassManager({
  classes,
  request,
  onError,
  onSuccess,
  onRefresh,
  onOpenThthPanel,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  // Create class modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  // Edit class modal state
  const [editingClass, setEditingClass] = useState<AdminClassRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Expanded class detail state
  const [expandedClassId, setExpandedClassId] = useState<string>("");
  const [classDetails, setClassDetails] = useState<Record<string, ClassDetailResponse>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string>("");

  // Add member inside class detail
  const [newMemberIdentifier, setNewMemberIdentifier] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"student" | "teacher">("student");

  const loadClassDetail = async (classId: string) => {
    setLoadingDetailId(classId);
    try {
      const data = await request<ClassDetailResponse>(
        `/api/admin/classes?classId=${encodeURIComponent(classId)}`,
      );
      setClassDetails((prev) => ({ ...prev, [classId]: data }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không tải được chi tiết lớp học.");
    } finally {
      setLoadingDetailId("");
    }
  };

  const toggleExpandClass = (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId("");
      return;
    }
    setExpandedClassId(classId);
    void loadClassDetail(classId);
  };

  const handleCreateClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setBusy("create-class");
    onError("");
    try {
      await request("/api/admin/classes", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          name: createName.trim(),
          description: createDescription.trim(),
        }),
      });
      setShowCreateModal(false);
      setCreateName("");
      setCreateDescription("");
      onSuccess?.(`Đã tạo lớp học "${createName.trim()}" thành công!`);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không tạo được lớp học.");
    } finally {
      setBusy("");
    }
  };

  const handleSaveEditClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editName.trim()) return;
    setBusy(`edit:${editingClass.id}`);
    onError("");
    try {
      await request("/api/admin/classes", {
        method: "PATCH",
        body: JSON.stringify({
          id: editingClass.id,
          name: editName.trim(),
          description: editDescription.trim(),
        }),
      });
      setEditingClass(null);
      onSuccess?.("Đã cập nhật thông tin lớp học.");
      onRefresh();
      if (expandedClassId === editingClass.id) {
        void loadClassDetail(editingClass.id);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không cập nhật được lớp học.");
    } finally {
      setBusy("");
    }
  };

  const handleDeleteClass = async (item: AdminClassRow) => {
    if (
      !window.confirm(
        `Xóa lớp “${item.name}” (${item.code}), toàn bộ thành viên, bài tập và tiến độ liên quan? Thao tác này không thể hoàn tác.`,
      )
    )
      return;
    setBusy(`delete:${item.id}`);
    onError("");
    try {
      await request(`/api/admin/classes?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      if (expandedClassId === item.id) setExpandedClassId("");
      onSuccess?.(`Đã xóa lớp "${item.name}".`);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không xóa được lớp học.");
    } finally {
      setBusy("");
    }
  };

  const handleAddMember = async (e: FormEvent, classId: string) => {
    e.preventDefault();
    if (!newMemberIdentifier.trim()) return;
    setBusy(`add-member:${classId}`);
    onError("");
    try {
      await request("/api/admin/classes", {
        method: "POST",
        body: JSON.stringify({
          action: "add_member",
          classId,
          identifier: newMemberIdentifier.trim(),
          role: newMemberRole,
        }),
      });
      setNewMemberIdentifier("");
      onSuccess?.("Đã thêm học viên vào lớp!");
      await loadClassDetail(classId);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không thêm được thành viên vào lớp.");
    } finally {
      setBusy("");
    }
  };

  const handleMemberAction = async (
    classId: string,
    userId: string,
    actionName: "approve_member" | "remove_member" | "change_role",
    role?: string,
  ) => {
    setBusy(`${actionName}:${userId}`);
    onError("");
    try {
      await request("/api/admin/classes", {
        method: "POST",
        body: JSON.stringify({
          action: actionName,
          classId,
          userId,
          role,
        }),
      });
      await loadClassDetail(classId);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Thao tác thành viên thất bại.");
    } finally {
      setBusy("");
    }
  };

  const handleDeleteAssignment = async (classId: string, assignment: ClassAssignment) => {
    if (!window.confirm(`Xóa bài tập “${assignment.title}” khỏi lớp này?`)) return;
    setBusy(`del-assign:${assignment.id}`);
    onError("");
    try {
      await request("/api/admin/classes", {
        method: "POST",
        body: JSON.stringify({
          action: "delete_assignment",
          classId,
          assignmentId: assignment.id,
        }),
      });
      onSuccess?.(`Đã xóa bài tập "${assignment.title}".`);
      await loadClassDetail(classId);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không xóa được bài tập.");
    } finally {
      setBusy("");
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1800);
  };

  const filteredClasses = classes.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.ownerName?.toLowerCase().includes(q) ||
      item.ownerEmail?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="card-duo rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            Quản lý Lớp học & Bài tập ({classes.length} lớp)
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
            Tạo lớp mới, thêm học viên bằng email, duyệt yêu cầu vào lớp, phân quyền giáo viên và quản lý bài tập được giao.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenThthPanel && (
            <button
              type="button"
              onClick={onOpenThthPanel}
              className={ghostBtnCls}
            >
              <BookOpen className="h-4 w-4 text-blue-500" />
              Giao bài Tiếng Hàn Tổng Hợp
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            Tạo lớp học mới
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex flex-1 min-w-[260px] items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#132247] px-3.5 py-2 shadow-inner">
          <Search className="h-4 w-4 text-stone-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên lớp, mã lớp (VD: HAECHI-...), tên hoặc email chủ lớp..."
            className="w-full bg-transparent text-xs text-stone-900 dark:text-white outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="text-stone-400 hover:text-stone-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {/* Class List */}
      <div className="space-y-3">
        {filteredClasses.map((item) => {
          const isExpanded = expandedClassId === item.id;
          const detail = classDetails[item.id];
          const isLoadingDetail = loadingDetailId === item.id;

          return (
            <article
              key={item.id}
              className={`card-duo rounded-2xl overflow-hidden transition-all ${
                isExpanded ? "ring-2 ring-blue-500/40" : ""
              }`}
            >
              <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-stone-900 dark:text-white">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => copyClassCode(item.code)}
                      title="Sao chép mã lớp"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-600 dark:text-sky-300 transition cursor-pointer"
                    >
                      {item.code}
                      {copiedCode === item.code ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-70" />
                      )}
                    </button>
                    <span className="rounded-full bg-stone-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-stone-600 dark:text-slate-300">
                      {item.members} thành viên
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                      {item.assignments} bài tập
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-600 dark:text-slate-300">
                    {item.description || "Chưa có mô tả lớp học"}
                  </p>
                  <p className="mt-1 text-[11px] text-stone-400 dark:text-slate-500">
                    Chủ lớp: <strong className="text-stone-600 dark:text-slate-300">{item.ownerName}</strong> ({item.ownerEmail}) · Tạo ngày {String(item.createdAt).slice(0, 10)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleExpandClass(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      isExpanded
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-sky-300 hover:bg-blue-100"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {isExpanded ? "Đóng chi tiết" : "Quản lý học viên & bài tập"}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClass(item);
                      setEditName(item.name);
                      setEditDescription(item.description || "");
                    }}
                    className={ghostBtnCls}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={busy === `delete:${item.id}`}
                    onClick={() => void handleDeleteClass(item)}
                    className={dangerBtnCls}
                  >
                    {busy === `delete:${item.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Xóa
                  </button>
                </div>
              </div>

              {/* Expanded Detail Drawer */}
              {isExpanded && (
                <div className="border-t border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/50 p-4 sm:p-6">
                  {isLoadingDetail && !detail ? (
                    <div className="py-8 text-center text-xs text-stone-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-500" />
                      Đang tải danh sách thành viên và bài tập...
                    </div>
                  ) : detail ? (
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                      {/* Left Column: Members Management */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            Thành viên trong lớp ({detail.members.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => void loadClassDetail(item.id)}
                            className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                          >
                            Làm mới
                          </button>
                        </div>

                        {/* Add member form */}
                        <form
                          onSubmit={(e) => void handleAddMember(e, item.id)}
                          className="flex flex-wrap gap-2 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#101d3d] p-3"
                        >
                          <input
                            required
                            value={newMemberIdentifier}
                            onChange={(e) => setNewMemberIdentifier(e.target.value)}
                            placeholder="Nhập email học viên để thêm thẳng vào lớp..."
                            className="flex-1 min-w-[200px] bg-transparent px-2 py-1 text-xs text-stone-900 dark:text-white outline-none"
                          />
                          <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value as "student" | "teacher")}
                            className={selectCls}
                          >
                            <option value="student">Học viên</option>
                            <option value="teacher">Giáo viên phụ trách</option>
                          </select>
                          <button
                            type="submit"
                            disabled={busy === `add-member:${item.id}`}
                            className="btn-duo btn-duo-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
                          >
                            {busy === `add-member:${item.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            Thêm vào lớp
                          </button>
                        </form>

                        {/* Member table */}
                        <div className="max-h-96 overflow-y-auto divide-y divide-stone-200 dark:divide-slate-800 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#101d3d]">
                          {detail.members.map((m) => {
                            const isPending = m.role === "pending";
                            const isOwner = m.userId === detail.class.ownerId || m.role === "owner";
                            return (
                              <div
                                key={m.userId}
                                className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-900 dark:text-white">{m.name}</span>
                                    {isOwner && (
                                      <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-extrabold text-violet-600 dark:text-violet-300">
                                        Chủ lớp
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-300">
                                        Chờ duyệt
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                                    {m.email} · {m.xp} XP · Chuỗi {m.streak || 0} ngày
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isPending ? (
                                    <button
                                      type="button"
                                      disabled={busy === `approve_member:${m.userId}`}
                                      onClick={() =>
                                        void handleMemberAction(item.id, m.userId, "approve_member")
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                      Duyệt vào lớp
                                    </button>
                                  ) : !isOwner ? (
                                    <select
                                      value={m.role}
                                      disabled={busy === `change_role:${m.userId}`}
                                      onChange={(e) =>
                                        void handleMemberAction(
                                          item.id,
                                          m.userId,
                                          "change_role",
                                          e.target.value,
                                        )
                                      }
                                      className={selectCls}
                                    >
                                      <option value="student">Học viên</option>
                                      <option value="teacher">Giáo viên</option>
                                    </select>
                                  ) : null}

                                  {!isOwner && (
                                    <button
                                      type="button"
                                      disabled={busy === `remove_member:${m.userId}`}
                                      onClick={() => {
                                        if (window.confirm(`Xóa ${m.name} khỏi lớp này?`)) {
                                          void handleMemberAction(item.id, m.userId, "remove_member");
                                        }
                                      }}
                                      className={dangerBtnCls}
                                      title="Xóa khỏi lớp"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {detail.members.length === 0 && (
                            <p className="p-5 text-center text-xs text-stone-400">
                              Chưa có thành viên nào trong lớp.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Class Assignments */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                            Bài tập đã giao ({detail.assignments.length})
                          </h4>
                          {onOpenThthPanel && (
                            <button
                              type="button"
                              onClick={onOpenThthPanel}
                              className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                            >
                              + Giao thêm bài THTH
                            </button>
                          )}
                        </div>

                        <div className="max-h-96 overflow-y-auto divide-y divide-stone-200 dark:divide-slate-800 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#101d3d]">
                          {detail.assignments.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-start justify-between gap-3 p-3.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-stone-900 dark:text-white">{a.title}</p>
                                {a.description && (
                                  <p className="mt-0.5 text-[11px] text-stone-500 dark:text-slate-400">
                                    {a.description}
                                  </p>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-stone-400">
                                  <span className="rounded bg-blue-500/10 px-2 py-0.5 font-bold text-blue-600 dark:text-sky-300">
                                    {a.cardCount} thẻ
                                  </span>
                                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-300">
                                    {a.completedMembers} học viên đã học
                                  </span>
                                  {a.dueDate && <span>Hạn: {a.dueDate}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`/flashcards?assignment=${encodeURIComponent(a.id)}&classId=${encodeURIComponent(item.id)}`}
                                  className={ghostBtnCls}
                                  title="Học thử bài tập này"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  disabled={busy === `del-assign:${a.id}`}
                                  onClick={() => void handleDeleteAssignment(item.id, a)}
                                  className={dangerBtnCls}
                                  title="Xóa bài tập"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {detail.assignments.length === 0 && (
                            <div className="p-6 text-center text-xs text-stone-400 space-y-2">
                              <p>Chưa có bài tập nào được giao cho lớp này.</p>
                              {onOpenThthPanel && (
                                <button
                                  type="button"
                                  onClick={onOpenThthPanel}
                                  className={ghostBtnCls}
                                >
                                  Giao bài từ bộ Tiếng Hàn Tổng Hợp
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}

        {filteredClasses.length === 0 && (
          <div className="card-duo rounded-2xl p-8 text-center text-sm text-stone-500 dark:text-slate-400">
            Không tìm thấy lớp học nào phù hợp.
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateClass}
            className="card-duo w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                Tạo lớp học mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={ghostBtnCls}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className={labelCls}>
              Tên lớp học *
              <input
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="VD: Lớp Sơ cấp 2 - Tối 2/4/6"
                className={`mt-1.5 ${fieldCls}`}
              />
            </label>
            <label className={labelCls}>
              Mô tả lớp học
              <textarea
                rows={3}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Ghi chú lịch học, giáo trình hoặc mục tiêu lớp..."
                className={`mt-1.5 ${fieldCls}`}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={ghostBtnCls}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy === "create-class"}
                className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
              >
                {busy === "create-class" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Tạo lớp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEditClass}
            className="card-duo w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                Sửa thông tin lớp ({editingClass.code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className={ghostBtnCls}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className={labelCls}>
              Tên lớp học *
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`mt-1.5 ${fieldCls}`}
              />
            </label>
            <label className={labelCls}>
              Mô tả lớp học
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className={`mt-1.5 ${fieldCls}`}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className={ghostBtnCls}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy === `edit:${editingClass.id}`}
                className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
              >
                {busy === `edit:${editingClass.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
