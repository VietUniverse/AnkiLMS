"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Flame, ChevronLeft, ChevronRight, Calendar, Sparkles } from "lucide-react";
import { getLunarDate, formatLunarCellText } from "@/lib/lunarCalendar";

export interface HeatmapItem {
  checkin_date: string; // YYYY-MM-DD
  time_spent_minutes: number;
  xp_earned: number;
  cards_reviewed?: number;
}

interface OnigiriHeatmapProps {
  data: HeatmapItem[];
  streak?: number;
  showDemo?: boolean;
  onToggleDemo?: () => void;
  className?: string;
}

type ViewMode = "year" | "month" | "week";

// Classify study time into 8 intensity levels (0-8) matching Onigiri algorithm
function getIntensityLevel(minutes: number, dailyAverage: number): number {
  if (!minutes || minutes <= 0) return 0;
  const avg = Math.max(dailyAverage, 15);
  if (minutes < 0.3 * avg) return 1;
  if (minutes < 0.6 * avg) return 2;
  if (minutes < 0.9 * avg) return 3;
  if (minutes < 1.2 * avg) return 4;
  if (minutes < 1.6 * avg) return 5;
  if (minutes < 2.0 * avg) return 6;
  if (minutes < 2.5 * avg) return 7;
  return 8;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const OnigiriHeatmap: React.FC<OnigiriHeatmapProps> = ({
  data,
  streak = 0,
  showDemo = false,
  onToggleDemo,
  className = "",
}) => {
  const [view, setView] = useState<ViewMode>("year");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const yearScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (view === "year" && yearScrollRef.current) {
      const el = yearScrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [view]);
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    minutes: number;
    xp: number;
    cards: number;
    level: number;
    x: number;
    y: number;
    lunarStr?: string;
  } | null>(null);

  const getLunarLabel = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return "";
    const [y, m, d] = parts;
    const lunar = getLunarDate(d, m, y);
    return `${lunar.day}/${lunar.month}${lunar.isLeap ? " (Nhuận)" : ""} Âm`;
  };

  // Map data by date string
  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapItem>();
    data.forEach((item) => {
      map.set(item.checkin_date, item);
    });
    return map;
  }, [data]);

  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  // Calculate daily average across active days
  const { activeDaysCount, totalMinutes, longestStreak, dailyAverage } = useMemo(() => {
    let active = 0;
    let mins = 0;
    let longest = 0;
    let currentRun = 0;

    // Sort dates
    const sortedDates = Array.from(dataMap.keys()).sort();
    sortedDates.forEach((dateStr, idx) => {
      const item = dataMap.get(dateStr);
      if (item && item.time_spent_minutes > 0) {
        active++;
        mins += item.time_spent_minutes;

        if (idx > 0) {
          const prev = new Date(sortedDates[idx - 1]);
          const curr = new Date(dateStr);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            currentRun++;
          } else {
            currentRun = 1;
          }
        } else {
          currentRun = 1;
        }
        longest = Math.max(longest, currentRun);
      }
    });

    const avg = active > 0 ? Math.round(mins / active) : 20;
    return {
      activeDaysCount: active,
      totalMinutes: mins,
      longestStreak: Math.max(longest, streak),
      dailyAverage: avg,
    };
  }, [dataMap, streak]);

  // Year View: 53 weeks (371 days) starting from first week of selected year
  const yearGrid = useMemo(() => {
    const firstDayOfYear = new Date(selectedYear, 0, 1);
    // Day of week: 0 = Sunday, 1 = Monday, etc. Adjust for Monday start: (day + 6) % 7
    const mondayOffset = (firstDayOfYear.getDay() + 6) % 7;
    const startDate = new Date(firstDayOfYear);
    startDate.setDate(firstDayOfYear.getDate() - mondayOffset);

    const weeks: Array<
      Array<{
        date: Date;
        dateStr: string;
        inYear: boolean;
        item?: HeatmapItem;
        level: number;
        isToday: boolean;
        isFuture: boolean;
      }>
    > = [];

    const monthLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (let w = 0; w < 53; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + w * 7 + d);
        const inYear = currentDate.getFullYear() === selectedYear;
        const dateStr = formatDateKey(currentDate);
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;
        const item = dataMap.get(dateStr);
        const level = item ? getIntensityLevel(item.time_spent_minutes, dailyAverage) : 0;

        if (d === 0 && inYear && currentDate.getMonth() !== lastMonth) {
          lastMonth = currentDate.getMonth();
          const label = `Th${lastMonth + 1}`;
          monthLabels.push({ label, weekIndex: w });
        }

        weekDays.push({
          date: currentDate,
          dateStr,
          inYear,
          item,
          level,
          isToday,
          isFuture,
        });
      }
      weeks.push(weekDays);
    }

    return { weeks, monthLabels };
  }, [selectedYear, todayStr, dataMap, dailyAverage]);

  // Month View: Days of selected month
  const monthGrid = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
    const totalDays = lastDay.getDate();

    const cells: Array<{
      dayNum?: number;
      dateStr?: string;
      level: number;
      isToday: boolean;
      isFuture: boolean;
      item?: HeatmapItem;
      lunarText?: string;
      lunar?: import("@/lib/lunarCalendar").LunarDate;
    }> = [];

    // Empty lead cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ level: 0, isToday: false, isFuture: false });
    }

    // Actual days
    for (let day = 1; day <= totalDays; day++) {
      const cur = new Date(selectedYear, selectedMonth, day);
      const dateStr = formatDateKey(cur);
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const item = dataMap.get(dateStr);
      const level = item ? getIntensityLevel(item.time_spent_minutes, dailyAverage) : 0;
      const lunar = getLunarDate(day, selectedMonth + 1, selectedYear);
      const lunarText = formatLunarCellText(lunar);

      cells.push({
        dayNum: day,
        dateStr,
        level,
        isToday,
        isFuture,
        item,
        lunarText,
        lunar,
      });
    }

    return cells;
  }, [selectedYear, selectedMonth, todayStr, dataMap, dailyAverage]);

  // Week View: Current week (7 days)
  const weekGrid = useMemo(() => {
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    const days = [];
    const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    const shortDayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const dateStr = formatDateKey(cur);
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const item = dataMap.get(dateStr);
      const level = item ? getIntensityLevel(item.time_spent_minutes, dailyAverage) : 0;
      const lunar = getLunarDate(cur.getDate(), cur.getMonth() + 1, cur.getFullYear());
      const lunarText = formatLunarCellText(lunar);

      days.push({
        name: dayNames[i],
        shortName: shortDayNames[i],
        dayNum: cur.getDate(),
        monthNum: cur.getMonth() + 1,
        dateStr,
        isToday,
        isFuture,
        item,
        level,
        lunarText,
        lunar,
      });
    }

    return days;
  }, [todayStr, dataMap, dailyAverage]);

  return (
    <div
      id="onigiri-heatmap-container"
      className={`relative rounded-2xl p-5 sm:p-6 bg-[#0f131a] text-slate-100 shadow-xl overflow-hidden border-0 ${className}`}
    >
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* --- Onigiri Header --- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5 relative z-10">
        {/* Header Left: Onigiri Avatar & Title */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center p-1.5 shadow-sm group border-0">
            <img
              src="/onigiri.svg"
              alt="Onigiri"
              className="w-full h-full object-contain filter invert opacity-90 group-hover:scale-110 transition-transform duration-200"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold tracking-wider uppercase text-white">
                HOẠT ĐỘNG ÔN TẬP
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 tracking-wide border-0">
                ONIGIRI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Biểu đồ nhiệt chuyên cần & chu kỳ ôn tập Spaced Repetition
            </p>
          </div>
        </div>

        {/* Header Right: Streak + Nav + Views filter */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Streak Counter Chip */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 text-xs font-semibold shadow-sm border-0"
            title="Chuỗi ngày liên tục học tập"
          >
            <Flame className="w-4 h-4 text-orange-400 animate-pulse fill-orange-400/30" />
            <span>{streak} ngày liên tiếp</span>
          </div>

          {/* Navigation Year / Month Buttons */}
          <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-[#181d28] text-xs border-0">
            <button
              onClick={() => {
                if (view === "month") {
                  setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1));
                  if (selectedMonth === 0) setSelectedYear((y) => y - 1);
                } else {
                  setSelectedYear((y) => y - 1);
                }
              }}
              className="p-1 rounded hover:bg-[#252c3c] text-slate-300 transition-colors"
              title="Lùi lại"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-slate-200">
              {view === "month" ? `Thg ${selectedMonth + 1}, ${selectedYear}` : selectedYear}
            </span>
            <button
              onClick={() => {
                if (view === "month") {
                  setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1));
                  if (selectedMonth === 11) setSelectedYear((y) => y + 1);
                } else {
                  setSelectedYear((y) => y + 1);
                }
              }}
              className="p-1 rounded hover:bg-[#252c3c] text-slate-300 transition-colors"
              title="Tiến lên"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Filter Pill Switcher (Year, Month, Week) */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#181d28] text-xs border-0">
            <button
              onClick={() => setView("year")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all border-0 ${
                view === "year"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Năm
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all border-0 ${
                view === "month"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all border-0 ${
                view === "week"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tuần
            </button>
          </div>

          {/* Demo Toggle Button */}
          {onToggleDemo && (
            <button
              onClick={onToggleDemo}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#181d28] hover:bg-[#202736] text-slate-300 transition-all flex items-center gap-1.5 border-0"
              title="Bật/Tắt dữ liệu demo"
            >
              <span
                className={`w-2 h-2 rounded-full ${showDemo ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}
              />
              <span>{showDemo ? "Mẫu" : "Thật"}</span>
            </button>
          )}
        </div>
      </div>

      {/* --- Heatmap Body --- */}
      <div ref={yearScrollRef} className="relative z-10 bg-[#0a0d14] rounded-xl p-2.5 sm:p-4 overflow-x-auto scrollbar-thin border-0 touch-pan-x">
        {/* YEAR VIEW */}
        {view === "year" && (
          <div className="inline-flex flex-col min-w-max mx-auto text-left">
            {/* Months Header */}
            <div className="flex gap-1 sm:gap-1.5 text-[10px] font-mono text-slate-400 h-4 mb-2 pl-7 sm:pl-8">
              {yearGrid.weeks.map((_, wIdx) => {
                const month = yearGrid.monthLabels.find((m) => m.weekIndex === wIdx);
                return (
                  <div key={wIdx} className="w-3.5 sm:w-4 shrink-0 relative overflow-visible">
                    {month && (
                      <span className="absolute left-0 top-0 whitespace-nowrap font-bold text-slate-400 uppercase tracking-tight text-[10px]">
                        {month.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 7 Rows × 53 Cols Grid */}
            <div className="flex gap-1.5 sm:gap-2 items-center">
              {/* Weekday Labels (T2, T4, T6) */}
              <div className="flex flex-col gap-1 sm:gap-1.5 text-[9px] font-mono text-slate-500 select-none pr-1">
                <span className="h-3.5 sm:h-4 flex items-center justify-end">T2</span>
                <span className="h-3.5 sm:h-4 flex items-center justify-end opacity-0">T3</span>
                <span className="h-3.5 sm:h-4 flex items-center justify-end">T4</span>
                <span className="h-3.5 sm:h-4 flex items-center justify-end opacity-0">T5</span>
                <span className="h-3.5 sm:h-4 flex items-center justify-end">T6</span>
                <span className="h-3.5 sm:h-4 flex items-center justify-end opacity-0">T7</span>
                <span className="h-3.5 sm:h-4 flex items-center justify-end opacity-0">CN</span>
              </div>

              {/* 53 Columns */}
              <div className="flex gap-1 sm:gap-1.5">
                {yearGrid.weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 sm:gap-1.5">
                    {week.map((cell) => {
                      if (!cell.inYear) {
                        return (
                          <div
                            key={cell.dateStr}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      return (
                        <div
                          key={cell.dateStr}
                          data-level={cell.level}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              dateStr: cell.dateStr,
                              minutes: cell.item?.time_spent_minutes || 0,
                              xp: cell.item?.xp_earned || 0,
                              cards: cell.item?.cards_reviewed || (cell.item?.time_spent_minutes ? Math.round(cell.item.time_spent_minutes * 2.5) : 0),
                              level: cell.level,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              lunarStr: getLunarLabel(cell.dateStr),
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`onigiri-day-cell onigiri-level-${cell.level} w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] cursor-pointer transition-transform duration-150 relative ${
                            cell.isToday ? "scale-110 shadow-md z-10" : ""
                          } ${cell.isFuture ? "opacity-20" : ""}`}
                        >
                          {cell.isToday && (
                            <span className="w-1 h-1 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {view === "month" && (
          <div className="max-w-md mx-auto py-2">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400">
              <span>T2</span>
              <span>T3</span>
              <span>T4</span>
              <span>T5</span>
              <span>T6</span>
              <span>T7</span>
              <span className="text-rose-400">CN</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((c, idx) => {
                if (!c.dayNum) {
                  return <div key={idx} className="aspect-square opacity-0 pointer-events-none" />;
                }
                return (
                  <div
                    key={c.dateStr}
                    data-level={c.level}
                    onMouseEnter={(e) => {
                      if (!c.dateStr) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({
                        dateStr: c.dateStr,
                        minutes: c.item?.time_spent_minutes || 0,
                        xp: c.item?.xp_earned || 0,
                        cards: c.item?.cards_reviewed || (c.item?.time_spent_minutes ? Math.round(c.item.time_spent_minutes * 2.5) : 0),
                        level: c.level,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        lunarStr: getLunarLabel(c.dateStr),
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`onigiri-day-cell onigiri-level-${c.level} aspect-square rounded-lg flex flex-col items-center justify-center p-1 cursor-pointer transition-transform duration-150 ${
                      c.isToday ? "scale-105 z-10 shadow-md ring-2 ring-sky-400/50" : ""
                    } ${c.isFuture ? "opacity-25" : ""}`}
                  >
                    <span
                      className={`text-xs font-bold leading-tight ${
                        c.level > 4 ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      {c.dayNum}
                    </span>
                    {c.lunarText && (
                      <span
                        className={`onigiri-lunar-text text-[9px] font-medium leading-none ${
                          c.level > 4 ? "text-slate-900/75" : "text-slate-400"
                        }`}
                      >
                        {c.lunarText}
                      </span>
                    )}
                    {c.item && c.item.time_spent_minutes > 0 && (
                      <span
                        className={`text-[8px] font-mono leading-none mt-0.5 ${
                          c.level > 4 ? "text-slate-900/90 font-bold" : "text-sky-300"
                        }`}
                      >
                        {c.item.time_spent_minutes}p
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-1 sm:gap-2.5 py-1 sm:py-2">
            {weekGrid.map((day) => (
              <div
                key={day.dateStr}
                data-level={day.level}
                className={`onigiri-day-cell onigiri-level-${day.level} rounded-xl p-1.5 sm:p-3 flex flex-col items-center justify-between min-h-[95px] sm:min-h-[110px] transition-transform duration-150 ${
                  day.isToday ? "scale-[1.02] shadow-lg ring-2 ring-sky-400/50 z-10" : ""
                } ${day.isFuture ? "opacity-35" : ""}`}
              >
                <div className="text-center w-full">
                  <p
                    className={`text-[10px] sm:text-xs font-bold ${
                      day.level > 4 ? "text-slate-900" : "text-slate-300"
                    }`}
                  >
                    <span className="sm:hidden">{day.shortName}</span>
                    <span className="hidden sm:inline">{day.name}</span>
                  </p>
                  <p
                    className={`text-xs sm:text-lg font-black leading-tight ${
                      day.level > 4 ? "text-slate-950" : "text-white"
                    }`}
                  >
                    {day.dayNum}/{day.monthNum}
                  </p>
                  <p
                    className={`onigiri-lunar-text text-[9px] sm:text-[10px] font-semibold tracking-tight ${
                      day.level > 4 ? "text-slate-900/75" : "text-slate-400"
                    }`}
                  >
                    <span className="hidden sm:inline">{day.lunarText} âm</span>
                    <span className="sm:hidden">{day.lunarText}</span>
                  </p>
                </div>

                <div className="text-center w-full mt-1 sm:mt-2 pt-1 sm:pt-2 bg-black/10 dark:bg-white/5 rounded-lg py-1 sm:py-1.5 border-0">
                  {day.item && day.item.time_spent_minutes > 0 ? (
                    <>
                      <p
                        className={`text-[10px] sm:text-xs font-extrabold ${
                          day.level > 4 ? "text-slate-950" : "text-sky-300"
                        }`}
                      >
                        <span className="hidden sm:inline">{day.item.time_spent_minutes} phút</span>
                        <span className="sm:hidden">{day.item.time_spent_minutes}p</span>
                      </p>
                      <p
                        className={`text-[9px] sm:text-[10px] ${
                          day.level > 4 ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        <span className="hidden sm:inline">+{day.item.xp_earned} XP</span>
                        <span className="sm:hidden">+{day.item.xp_earned}</span>
                      </p>
                    </>
                  ) : (
                    <span
                      className={`text-[9px] sm:text-[11px] ${
                        day.level > 4 ? "text-slate-800" : "text-slate-500"
                      }`}
                    >
                      <span className="hidden sm:inline">{day.isFuture ? "Kế hoạch" : "Chưa học"}</span>
                      <span className="sm:hidden">-</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Footer: Stats & Level Scale --- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-medium pt-4 relative z-10">
        {/* Onigiri Metrics */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>
              Tổng số: <b>{activeDaysCount}</b> ngày học
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Chuỗi dài nhất: <b>{longestStreak}</b> ngày
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>
              Trung bình: <b>{dailyAverage}</b> phút/ngày
            </span>
          </div>
        </div>

        {/* 9-Level Intensity Scale (0 to 8) */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] font-medium text-slate-400">Ít</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => (
              <div
                key={lvl}
                data-level={lvl}
                className={`onigiri-day-cell onigiri-level-${lvl} w-3.5 h-3.5 rounded-[3px]`}
                title={`Cấp độ ${lvl}/8`}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-slate-400">Nhiều</span>
        </div>
      </div>

      {/* --- Floating Tooltip --- */}
      {hoveredCell && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-2 bg-[#0c1017] text-white rounded-lg px-3 py-2 shadow-2xl text-xs space-y-0.5 animate-fadeIn border-0"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 8,
          }}
        >
          <p className="font-bold text-sky-400 flex items-center gap-1.5 flex-wrap">
            <span>{hoveredCell.dateStr}</span>
            {hoveredCell.lunarStr && (
              <span className="text-[11px] font-normal text-slate-300">
                ({hoveredCell.lunarStr})
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 ml-auto">
              Cấp {hoveredCell.level}/8
            </span>
          </p>
          {hoveredCell.minutes > 0 ? (
            <p className="text-slate-200">
              <b>{hoveredCell.minutes} phút học</b> • +{hoveredCell.xp} XP • {hoveredCell.cards} thẻ
            </p>
          ) : (
            <p className="text-slate-400 italic">Chưa có hoạt động học</p>
          )}
        </div>
      )}
    </div>
  );
};

OnigiriHeatmap.displayName = "OnigiriHeatmap";
