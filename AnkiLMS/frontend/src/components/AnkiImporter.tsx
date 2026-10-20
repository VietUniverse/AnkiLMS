"use client";

import React, { useState } from "react";
import { Upload, X, CheckCircle, FileText, Loader2, Sparkles } from "lucide-react";
import { AnkiParser, AnkiDeck } from "../lib/ankiParser";

interface AnkiImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (decks: AnkiDeck[]) => void;
}

export const AnkiImporter: React.FC<AnkiImporterProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDecks, setSuccessDecks] = useState<AnkiDeck[] | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processFile(files[0]);
  };

  const processFile = async (file: File) => {
    const extension = file.name.toLocaleLowerCase();
    if (!extension.endsWith(".apkg") && !extension.endsWith(".zip")) {
      setError("Vui lòng chọn đúng file có định dạng .apkg (Anki Deck Archive)");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessDecks(null);

    try {
      const decks = await AnkiParser.parseApkg(file);
      if (decks.length === 0) {
        throw new Error("Không tìm thấy thẻ nào trong bộ thẻ Anki này.");
      }
      setSuccessDecks(decks);
      setError(null);
      onImportComplete(decks);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi đọc file .apkg. Vui lòng kiểm tra lại file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Import Bộ Thẻ Anki (.apkg)</h2>
            <p className="text-xs text-slate-400">Đọc trực tiếp dữ liệu SQLite & Media 100% Offline</p>
          </div>
        </div>

        {/* Dropzone Container */}
        {!successDecks && !loading && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-900/30 rounded-2xl p-8 text-center transition-all cursor-pointer group"
          >
            <input
              type="file"
              accept=".apkg,.zip"
              onChange={handleFileChange}
              className="hidden"
              id="apkg-input"
            />
            <label htmlFor="apkg-input" className="cursor-pointer flex flex-col items-center">
              <FileText className="w-12 h-12 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-slate-200 mb-1">
                Kéo thả file .apkg vào đây
              </span>
              <span className="text-xs text-slate-400 mb-4">hoặc nhấn để chọn từ thiết bị của bạn</span>
              <span className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md">
                Duyệt File trên máy
              </span>
            </label>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-12 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-200">Đang giải nén & đọc dữ liệu SQLite Anki...</p>
            <p className="text-xs text-slate-400 mt-1">Quá trình diễn ra trực tiếp trên thiết bị của bạn</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !successDecks && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Success View */}
        {successDecks && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Nhập bộ thẻ thành công!</h4>
                <p className="text-xs text-emerald-300/80">
                  Đã tải {successDecks.reduce((sum, d) => sum + d.cardCount, 0)} thẻ vào bộ nhớ cá nhân.
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {successDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700"
                >
                  <span className="font-bold text-xs text-slate-200">{deck.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                    {deck.cardCount} thẻ
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40"
            >
              Bắt đầu Học Ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
