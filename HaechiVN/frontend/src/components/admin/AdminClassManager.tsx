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
  "w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner";
const selectCls =
  "rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#132247] px-3 py-2 text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
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

  const totalMembers = classes.reduce((sum, item) => sum + (item.members || 0), 0);
  const totalAssignments = classes.reduce((sum, item) => sum + (item.assignments || 0), 0);
  const stats = [
    { label: "Lớp học", value: classes.length, icon: <GraduationCap className="h-4 w-4" />, tone: "text-blue-600 dark:text-sky-300 bg-blue-500/10" },
    { label: "Thành viên", value: totalMembers, icon: <Users className="h-4 w-4" />, tone: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/10" },
    { label: "Bài tập", value: totalAssignments, icon: <BookOpen className="h-4 w-4" />, tone: "text-violet-600 dark:text-violet-300 bg-violet-500/10" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="card-duo rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-black text-stone-900 dark:text-white sm:text-lg">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              Quản lý lớp học
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              Tạo lớp, duyệt học viên và giao bài tập.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {onOpenThthPanel && (
              <button type="button" onClick={onOpenThthPanel} className={`${ghostBtnCls} flex-1 sm:flex-none`}>
                <BookOpen className="h-4 w-4 text-blue-500" />
                Giao bài THTH
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn-duo btn-duo-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              Tạo lớp mới
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 dark:border-slate-800 bg-stone-50/60 dark:bg-[#101d3d] px-3 py-2.5"
            >
              <span className={`shrink-0 rounded-lg p-1.5 ${stat.tone}`}>{stat.icon}</span>
              <div className="min-w-0">
                <p className="text-base font-black leading-none text-stone-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wide text-stone-400 dark:text-slate-500">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#132247] px-3.5 py-2.5 shadow-inner">
          <Search className="h-4 w-4 shrink-0 text-stone-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên lớp, mã lớp, chủ lớp hoặc email..."
            className="w-full bg-transparent text-xs text-stone-900 outline-none dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="shrink-0 text-stone-400 transition hover:text-stone-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <span className="hidden shrink-0 text-[11px] font-bold text-stone-400 dark:text-slate-500 sm:inline">
          {filteredClasses.length}/{classes.length} lớp
        </span>
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
              className={`card-duo rounded-2xl overflow-hidden transition ${
                isExpanded ? "ring-2 ring-blue-500/40" : ""
              }`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <h3 className="truncate text-sm font-black text-stone-900 dark:text-white sm:text-base">
                        {item.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => copyClassCode(item.code)}
                        title="Sao chép mã lớp"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-extrabold text-blue-600 transition hover:bg-blue-500/20 dark:text-sky-300 cursor-pointer"
                      >
                        {item.code}
                        {copiedCode === item.code ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-70" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-stone-500 dark:text-slate-400">
                      Chủ lớp:{" "}
                      <strong className="font-bold text-stone-700 dark:text-slate-200">{item.ownerName}</strong>
                      {item.ownerEmail ? ` · ${item.ownerEmail}` : ""} · Tạo {String(item.createdAt).slice(0, 10)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClass(item);
                        setEditName(item.name);
                        setEditDescription(item.description || "");
                      }}
                      className={`${ghostBtnCls} px-2.5`}
                      title="Sửa thông tin lớp"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy === `delete:${item.id}`}
                      onClick={() => void handleDeleteClass(item)}
                      className={`${dangerBtnCls} px-2.5`}
                      title="Xóa lớp học"
                    >
                      {busy === `delete:${item.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {item.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600 dark:text-slate-300">
                    {item.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-600 dark:bg-slate-800 dark:text-slate-300">
                      <Users className="h-3 w-3" />
                      {item.members} thành viên
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                      <BookOpen className="h-3 w-3" />
                      {item.assignments} bài tập
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpandClass(item.id)}
                    className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer sm:w-auto ${
                      isExpanded
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-blue-200 bg-blue-50/70 text-blue-600 hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-sky-300"
                    }`}
                  >
                    {isExpanded ? "Đóng chi tiết" : "Quản lý lớp"}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-stone-200 bg-stone-50/70 px-4 pb-5 pt-4 dark:border-slate-800 dark:bg-slate-950/50 sm:px-5">
                  {isLoadingDetail && !detail ? (
                    <div className="py-10 text-center text-xs text-stone-500 dark:text-slate-400">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-500" />
                      Đang tải thành viên và bài tập...
                    </div>
                  ) : detail ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {/* Members */}
                      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101d3d]">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="flex items-center gap-2 text-sm font-black text-stone-900 dark:text-white">
                            <Users className="h-4 w-4 text-blue-500" />
                            Thành viên
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black text-stone-500 dark:bg-slate-800 dark:text-slate-300">
                              {detail.members.length}
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => void loadClassDetail(item.id)}
                            className="text-[11px] font-bold text-blue-600 hover:underline dark:text-sky-400 cursor-pointer"
                          >
                            Làm mới
                          </button>
                        </div>

                        <form
                          onSubmit={(e) => void handleAddMember(e, item.id)}
                          className="flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-2 dark:border-slate-800 dark:bg-[#0d1930]"
                        >
                          <input
                            required
                            value={newMemberIdentifier}
                            onChange={(e) => setNewMemberIdentifier(e.target.value)}
                            placeholder="Email học viên..."
                            className="min-w-[140px] flex-1 bg-transparent px-2 py-1.5 text-xs text-stone-900 outline-none dark:text-white"
                          />
                          <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value as "student" | "teacher")}
                            className={selectCls}
                          >
                            <option value="student">Học viên</option>
                            <option value="teacher">Giáo viên</option>
                          </select>
                          <button
                            type="submit"
                            disabled={busy === `add-member:${item.id}`}
                            className="btn-duo btn-duo-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
                          >
                            {busy === `add-member:${item.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            Thêm
                          </button>
                        </form>

                        <div className="max-h-[380px] divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200 dark:divide-slate-800 dark:border-slate-800">
                          {detail.members.map((m) => {
                            const isPending = m.role === "pending";
                            const isOwner = m.userId === detail.class.ownerId || m.role === "owner";
                            const initials = (m.name || m.email || "?")
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase();
                            return (
                              <div key={m.userId} className="flex items-center gap-2.5 p-2.5 text-xs">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-black text-stone-600 dark:bg-slate-800 dark:text-slate-200">
                                  {initials}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="truncate font-bold text-stone-900 dark:text-white">{m.name}</span>
                                    {isOwner && (
                                      <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-600 dark:text-violet-300">
                                        <ShieldCheck className="h-2.5 w-2.5" />
                                        Chủ lớp
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-300">
                                        Chờ duyệt
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-[11px] text-stone-500 dark:text-slate-400">
                                    {m.email} · {m.xp} XP · chuỗi {m.streak || 0} ngày
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {isPending ? (
                                    <button
                                      type="button"
                                      disabled={busy === `approve_member:${m.userId}`}
                                      onClick={() => void handleMemberAction(item.id, m.userId, "approve_member")}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 cursor-pointer"
                                    >
                                      <UserCheck className="h-3 w-3" />
                                      Duyệt
                                    </button>
                                  ) : !isOwner ? (
                                    <select
                                      value={m.role}
                                      disabled={busy === `change_role:${m.userId}`}
                                      onChange={(e) =>
                                        void handleMemberAction(item.id, m.userId, "change_role", e.target.value)
                                      }
                                      className="rounded-lg border border-stone-200 bg-white px-1.5 py-1 text-[11px] font-bold text-stone-700 outline-none dark:border-slate-700 dark:bg-[#132247] dark:text-slate-200"
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
                                      className={`${dangerBtnCls} px-1.5 py-1.5`}
                                      title="Xóa khỏi lớp"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {detail.members.length === 0 && (
                            <p className="p-6 text-center text-xs text-stone-400 dark:text-slate-500">
                              Chưa có thành viên nào trong lớp.
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Assignments */}
                      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101d3d]">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="flex items-center gap-2 text-sm font-black text-stone-900 dark:text-white">
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                            Bài tập
                            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black text-stone-500 dark:bg-slate-800 dark:text-slate-300">
                              {detail.assignments.length}
                            </span>
                          </h4>
                          {onOpenThthPanel && (
                            <button
                              type="button"
                              onClick={onOpenThthPanel}
                              className="text-[11px] font-bold text-blue-600 hover:underline dark:text-sky-400 cursor-pointer"
                            >
                              + Giao bài
                            </button>
                          )}
                        </div>

                        <div className="max-h-[380px] divide-y divide-stone-100 overflow-y-auto rounded-xl border border-stone-200 dark:divide-slate-800 dark:border-slate-800">
                          {detail.assignments.map((a) => (
                            <div key={a.id} className="flex items-start justify-between gap-2.5 p-3 text-xs">
                              <div className="min-w-0">
                                <p className="truncate font-bold text-stone-900 dark:text-white">{a.title}</p>
                                {a.description && (
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-500 dark:text-slate-400">
                                    {a.description}
                                  </p>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-bold text-blue-600 dark:text-sky-300">
                                    {a.cardCount} thẻ
                                  </span>
                                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-300">
                                    {a.completedMembers} đã học
                                  </span>
                                  {a.dueDate && (
                                    <span className="text-stone-400 dark:text-slate-500">Hạn {a.dueDate}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <a
                                  href={`/flashcards?assignment=${encodeURIComponent(a.id)}&classId=${encodeURIComponent(item.id)}`}
                                  className={`${ghostBtnCls} px-1.5 py-1.5`}
                                  title="Học thử bài tập này"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <button
                                  type="button"
                                  disabled={busy === `del-assign:${a.id}`}
                                  onClick={() => void handleDeleteAssignment(item.id, a)}
                                  className={`${dangerBtnCls} px-1.5 py-1.5`}
                                  title="Xóa bài tập"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {detail.assignments.length === 0 && (
                            <div className="space-y-2 p-6 text-center text-xs text-stone-400 dark:text-slate-500">
                              <p>Chưa có bài tập nào được giao.</p>
                              {onOpenThthPanel && (
                                <button type="button" onClick={onOpenThthPanel} className={ghostBtnCls}>
                                  Giao bài từ Tiếng Hàn Tổng Hợp
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}

        {filteredClasses.length === 0 && (
          <div className="card-duo rounded-2xl p-10 text-center">
            <GraduationCap className="mx-auto mb-2 h-8 w-8 text-stone-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-stone-600 dark:text-slate-300">
              {searchQuery ? "Không tìm thấy lớp phù hợp" : "Chưa có lớp học nào"}
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">
              {searchQuery ? "Thử từ khóa khác hoặc xóa bộ lọc." : "Tạo lớp đầu tiên để bắt đầu giao bài."}
            </p>
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
              <h3 className="text-base font-black text-stone-900 dark:text-white">Tạo lớp học mới</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className={ghostBtnCls}>
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
              <button type="button" onClick={() => setShowCreateModal(false)} className={ghostBtnCls}>
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
                Sửa lớp ({editingClass.code})
              </h3>
              <button type="button" onClick={() => setEditingClass(null)} className={ghostBtnCls}>
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
              <button type="button" onClick={() => setEditingClass(null)} className={ghostBtnCls}>
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy === `edit:${editingClass.id}`}
                className="btn-duo btn-duo-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
              >
                {busy === `edit:${editingClass.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
