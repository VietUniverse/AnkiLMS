import React from "react";

interface GardenFlowerProps {
  stage: 0 | 1 | 2 | 3 | 4;
  className?: string;
  animate?: boolean;
}

export const GardenFlower: React.FC<GardenFlowerProps> = React.memo(({ stage, className = "w-full h-full", animate = true }) => {
  // Stage 0: Đất trống / Hạt mầm đang ngủ trong đất
  if (stage === 0) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        <ellipse cx="12" cy="18" rx="5.5" ry="1.8" className="fill-slate-700/40 dark:fill-slate-700/50" />
        <circle cx="12" cy="17" r="1.3" className="fill-slate-500/50 dark:fill-slate-500/60" />
      </svg>
    );
  }

  // Stage 1: Mầm xanh vươn nhú (<15 phút) - Procedural stem & baby leaves
  if (stage === 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Đất nền màu tối êm */}
        <ellipse cx="12" cy="19.5" rx="5.5" ry="1.8" className="fill-slate-700/40 dark:fill-slate-800/60" />
        {/* Cọng mầm xanh vươn lên */}
        <path
          d="M 12 19.5 Q 11.5 15.5 12 11.5"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          className={animate ? "flower-stem" : ""}
        />
        {/* Lá mầm bên trái */}
        <path
          d="M 12 14 C 9 14 8 11 9 9 C 11 9 12 11 12 14 Z"
          fill="#4ade80"
          className={animate ? "flower-leaf" : ""}
        />
        {/* Lá mầm bên phải */}
        <path
          d="M 12 12.5 C 14.8 12.5 15.8 10 14.8 8.5 C 13.2 8.5 12 10 12 12.5 Z"
          fill="#16a34a"
          className={animate ? "flower-leaf" : ""}
          style={animate ? { animationDelay: "0.2s" } : undefined}
        />
      </svg>
    );
  }

  // Stage 2: Hoa Tulip / Nụ vươn nở (15-29 phút) - Procedural stem, foliage & blooming tulip cup
  if (stage === 2) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Đất */}
        <ellipse cx="12" cy="20" rx="5.5" ry="1.8" className="fill-slate-700/40 dark:fill-slate-800/60" />
        {/* Thân cành */}
        <path
          d="M 12 20 Q 12.5 15.5 12 9"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinecap="round"
          className={animate ? "flower-stem" : ""}
        />
        {/* Lá thân dài duyên dáng */}
        <path
          d="M 12 16 Q 7.5 15 6.8 11.5 Q 9 12.5 12 15"
          fill="#22c55e"
          className={animate ? "flower-leaf" : ""}
        />
        {/* Cánh hoa Tulip: cụm cánh khép nở thanh tú */}
        <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 8px" }}>
          {/* Cánh giữa */}
          <ellipse cx="12" cy="7.2" rx="3.2" ry="4.5" fill="#f43f5e" />
          {/* Cánh vòm trái */}
          <path
            d="M 12 11 C 9.2 11 8 8 9.5 5.5 C 11.2 7 12 9.8 12 11 Z"
            fill="#fb7185"
          />
          {/* Cánh vòm phải */}
          <path
            d="M 12 11 C 14.8 11 16 8 14.5 5.5 C 12.8 7 12 9.8 12 11 Z"
            fill="#e11d48"
          />
          {/* Vệt ánh sáng trên cánh hoa */}
          <path
            d="M 11.8 4 C 11.2 4.8 10.5 6.5 10.8 8"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>
      </svg>
    );
  }

  // Stage 3: Hoa Hướng Dương / Rực rỡ ánh dương (30-44 phút) - Procedural stem, radial petals & seed disc
  if (stage === 3) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Đất */}
        <ellipse cx="12" cy="20.5" rx="6" ry="1.8" className="fill-slate-700/40 dark:fill-slate-800/60" />
        {/* Thân hoa cứng cáp */}
        <path
          d="M 12 20.5 Q 11.5 16 12 10.5"
          stroke="#15803d"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={animate ? "flower-stem" : ""}
        />
        {/* Lá kép hai bên */}
        <path
          d="M 12 17 Q 7.5 17 6.5 14 Q 9.5 15 12 16.5"
          fill="#22c55e"
          className={animate ? "flower-leaf" : ""}
        />
        <path
          d="M 12 15 Q 16.5 15 17.5 12 Q 14.5 13 12 14.5"
          fill="#16a34a"
          className={animate ? "flower-leaf" : ""}
          style={animate ? { animationDelay: "0.2s" } : undefined}
        />
        {/* Vành hoa hướng dương xòe rộng */}
        <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 8.5px" }}>
          <g fill="#f59e0b">
            <ellipse cx="12" cy="3" rx="1.5" ry="3.2" />
            <ellipse cx="12" cy="14" rx="1.5" ry="3.2" />
            <ellipse cx="6.5" cy="8.5" rx="3.2" ry="1.5" />
            <ellipse cx="17.5" cy="8.5" rx="3.2" ry="1.5" />
            <ellipse cx="8" cy="4.5" rx="1.5" ry="3" transform="rotate(-45 8 4.5)" fill="#fbbf24" />
            <ellipse cx="16" cy="4.5" rx="1.5" ry="3" transform="rotate(45 16 4.5)" fill="#fbbf24" />
            <ellipse cx="8" cy="12.5" rx="1.5" ry="3" transform="rotate(45 8 12.5)" fill="#fbbf24" />
            <ellipse cx="16" cy="12.5" rx="1.5" ry="3" transform="rotate(-45 16 12.5)" fill="#fbbf24" />
          </g>
          {/* Nhụy hạt hướng dương nâu ấm */}
          <circle cx="12" cy="8.5" r="3.2" fill="#78350f" />
          <circle cx="12" cy="8.5" r="2.2" fill="#92400e" />
          <circle cx="11.2" cy="7.7" r="0.8" fill="#f59e0b" opacity="0.8" />
        </g>
      </svg>
    );
  }

  // Stage 4: Hoa Anh Đào / Tuyệt phẩm Sakura nở bung (45+ phút) - 5 notched petals, pistil, shimmering pollen
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible ${animate ? "flower-sparkle" : ""}`}
      aria-hidden="true"
      fill="none"
    >
      {/* Đất */}
      <ellipse cx="12" cy="20.5" rx="6" ry="1.8" className="fill-slate-700/40 dark:fill-slate-800/60" />
      {/* Thân cành */}
      <path
        d="M 12 20.5 Q 12.8 16 12 11"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
        className={animate ? "flower-stem" : ""}
      />
      {/* Lá xanh nhẹ */}
      <path
        d="M 12 16 Q 8 16 7 13.5 Q 9.5 14.5 12 15.5"
        fill="#22c55e"
        className={animate ? "flower-leaf" : ""}
      />
      {/* 5 cánh hoa anh đào nở bung */}
      <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 8.5px" }}>
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <g key={i} transform={`rotate(${deg} 12 8.5)`}>
            <path
              d="M 12 8.5 C 9.8 6 9.2 2.8 11 1.8 C 11.6 2.2 12 2.5 12.4 2.2 C 14.2 2.8 13.6 6 12 8.5 Z"
              fill={i % 2 === 0 ? "#f43f5e" : "#fb7185"}
            />
          </g>
        ))}
        {/* Đài hoa & Nhụy hoa */}
        <circle cx="12" cy="8.5" r="2.2" fill="#be123c" />
        <circle cx="12" cy="8.5" r="1.3" fill="#fef08a" />
        {/* Điểm nhấn phấn hoa lấp lánh */}
        <circle cx="11.3" cy="7.7" r="0.5" fill="#ffffff" />
      </g>
    </svg>
  );
});

GardenFlower.displayName = "GardenFlower";
