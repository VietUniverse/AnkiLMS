import React from "react";

interface GardenFlowerProps {
  stage: 0 | 1 | 2 | 3; // 0: Đất trống, 1: Mầm, 2: Nụ, 3: Hoa
  className?: string;
  animate?: boolean;
}

/**
 * GardenFlower: 1 loại hoa duy nhất với 3 tiến độ sinh trưởng tự nhiên (Mầm -> Nụ -> Hoa)
 * và ô đất vuông trống khi chưa trồng.
 */
export const GardenFlower: React.FC<GardenFlowerProps> = React.memo(({ stage, className = "w-full h-full", animate = true }) => {
  // Stage 0: Ô đất vuông trống (chưa trồng)
  if (stage === 0) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Luống đất vuông bo góc nhẹ nhàng */}
        <rect
          x="3.5"
          y="16.5"
          width="17"
          height="4.5"
          rx="1.5"
          className="fill-slate-700/40 dark:fill-slate-800/60"
        />
        {/* Rãnh gieo / hạt mầm đang ngủ */}
        <ellipse cx="12" cy="18.5" rx="2" ry="1" className="fill-slate-500/35 dark:fill-slate-600/45" />
      </svg>
    );
  }

  // Stage 1: Mầm (Cọng mầm xanh vươn nhú với 2 lá mầm tươi non)
  if (stage === 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Đất */}
        <rect
          x="3.5"
          y="17"
          width="17"
          height="4.5"
          rx="1.5"
          className="fill-slate-700/40 dark:fill-slate-800/60"
        />
        {/* Cọng mầm vươn lên */}
        <path
          d="M 12 17.5 Q 11.5 14 12 11"
          stroke="#22c55e"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={animate ? "flower-stem" : ""}
        />
        {/* Lá mầm trái */}
        <path
          d="M 12 13.5 C 9 13.5 8 10.5 9 9 C 11 9 12 11 12 13.5 Z"
          fill="#4ade80"
          className={animate ? "flower-leaf" : ""}
        />
        {/* Lá mầm phải */}
        <path
          d="M 12 12 C 15 12 16 9.5 15 8 C 13 8 12 10 12 12 Z"
          fill="#16a34a"
          className={animate ? "flower-leaf" : ""}
          style={animate ? { animationDelay: "0.18s" } : undefined}
        />
      </svg>
    );
  }

  // Stage 2: Nụ (Cành vươn cao với lá thân và búp nụ e ấp)
  if (stage === 2) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Đất */}
        <rect
          x="3.5"
          y="17.5"
          width="17"
          height="4"
          rx="1.5"
          className="fill-slate-700/40 dark:fill-slate-800/60"
        />
        {/* Thân cành vươn cao */}
        <path
          d="M 12 18 Q 12.3 14 12 8.5"
          stroke="#16a34a"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={animate ? "flower-stem" : ""}
        />
        {/* Lá cành xòe 2 bên */}
        <path
          d="M 12 15 Q 7.5 14.5 7 12 Q 9.5 12.5 12 14"
          fill="#22c55e"
          className={animate ? "flower-leaf" : ""}
        />
        <path
          d="M 12 13.5 Q 16.5 13 17 10.5 Q 14.5 11 12 12.5"
          fill="#15803d"
          className={animate ? "flower-leaf" : ""}
          style={animate ? { animationDelay: "0.18s" } : undefined}
        />
        {/* Búp nụ hoa e ấp */}
        <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 7.5px" }}>
          {/* Đài hoa xanh ôm gốc nụ */}
          <path d="M 9.5 9 Q 12 10.5 14.5 9 Q 13.5 11 12 11 Q 10.5 11 9.5 9 Z" fill="#15803d" />
          {/* Nụ hoa bầu bĩnh */}
          <ellipse cx="12" cy="6.8" rx="3.2" ry="4.2" fill="#f43f5e" />
          <path d="M 12 10.5 C 9.5 10.5 8.8 7.5 10.2 5 C 11.2 6.5 12 9 12 10.5 Z" fill="#fb7185" />
          <path d="M 12 10.5 C 14.5 10.5 15.2 7.5 13.8 5 C 12.8 6.5 12 9 12 10.5 Z" fill="#e11d48" />
        </g>
      </svg>
    );
  }

  // Stage 3: Hoa (Đóa hoa bung nở rực rỡ đầy đủ cánh và nhụy hoa)
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible ${animate ? "flower-sparkle" : ""}`}
      aria-hidden="true"
      fill="none"
    >
      {/* Đất */}
      <rect
        x="3.5"
        y="18"
        width="17"
        height="3.5"
        rx="1.5"
        className="fill-slate-700/40 dark:fill-slate-800/60"
      />
      {/* Thân cành hoa */}
      <path
        d="M 12 18.5 Q 12.5 14.5 12 10"
        stroke="#16a34a"
        strokeWidth="2.2"
        strokeLinecap="round"
        className={animate ? "flower-stem" : ""}
      />
      {/* Lá cành */}
      <path d="M 12 16 Q 8 15.5 7 13 Q 9.5 14 12 15" fill="#22c55e" className={animate ? "flower-leaf" : ""} />
      <path d="M 12 14.5 Q 16 14 17 11.5 Q 14.5 12.5 12 13.5" fill="#15803d" className={animate ? "flower-leaf" : ""} style={animate ? { animationDelay: "0.18s" } : undefined} />
      {/* 5 cánh hoa bung nở rực rỡ */}
      <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 7.5px" }}>
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <g key={i} transform={`rotate(${deg} 12 7.5)`}>
            <path
              d="M 12 7.5 C 9.8 5 9.2 1.8 11 0.8 C 11.6 1.2 12 1.5 12.4 1.2 C 14.2 1.8 13.6 5 12 7.5 Z"
              fill={i % 2 === 0 ? "#f43f5e" : "#fb7185"}
            />
          </g>
        ))}
        {/* Nhụy hoa vàng và điểm phấn hoa */}
        <circle cx="12" cy="7.5" r="2.2" fill="#be123c" />
        <circle cx="12" cy="7.5" r="1.3" fill="#fef08a" />
        <circle cx="11.3" cy="6.8" r="0.5" fill="#ffffff" />
      </g>
    </svg>
  );
});

GardenFlower.displayName = "GardenFlower";
