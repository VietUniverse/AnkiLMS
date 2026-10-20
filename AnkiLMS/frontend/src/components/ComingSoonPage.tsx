"use client";

import React from "react";
import Link from "next/link";

interface ComingSoonPageProps {
  title?: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title }) => {
  return (
    <div className="card-duo p-12 text-center max-w-xl mx-auto my-12 space-y-4 animate-fadeIn select-none">
      <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center text-2xl mx-auto">✨</div>
      <h2 className="text-xl font-black text-white capitalize">{title || "Tính Năng Đang Phát Triển"}</h2>
      <p className="text-xs text-slate-400">Phân hệ này đang được đội ngũ kĩ sư HaechiVN hoàn thiện và sẽ ra mắt trong bản cập nhật tiếp theo!</p>
      <Link href="/" className="btn-duo btn-duo-primary px-6 py-2.5 text-xs inline-block">Quay Về Trang Chủ</Link>
    </div>
  );
};
