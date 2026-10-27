import React from "react";

interface GardenFlowerProps {
  stage: 0 | 1 | 2 | 3; // 0: Đất trống, 1: Mầm, 2: Nụ, 3: Hoa
  className?: string;
  animate?: boolean;
}

/**
 * GardenFlower: Nhìn thẳng từ trên xuống (Top-down view / Bird's-eye view).
 * - Cả ô là một ô đất vuông màu nâu màu mỡ.
 * - Stage 0: Ô đất vuông trống (rãnh đất gieo hạt).
 * - Stage 1: Mầm (2 lá mầm xanh non xòe ngang từ tâm).
 * - Stage 2: Nụ (4 phiến lá xòe 4 hướng và búp nụ hoa tròn e ấp ở trung tâm).
 * - Stage 3: Hoa (Đóa hoa 5 cánh bung nở rực rỡ nhìn từ trên xuống, thấy rõ cánh và nhụy hoa vàng).
 */
export const GardenFlower: React.FC<GardenFlowerProps> = React.memo(({ stage, className = "w-full h-full", animate = true }) => {
  // Stage 0: Ô đất tĩnh chờ gieo mầm (Dormant cell)
  if (stage === 0) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        <circle cx="12" cy="12" r="1.5" className="fill-slate-500/35 dark:fill-slate-400/35" />
      </svg>
    );
  }

  // Stage 1: Mầm - 2 lá mầm xanh non xòe ngang từ tâm nhìn từ trên xuống
  if (stage === 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* Vệt đất ẩm quanh gốc */}
        <circle cx="12" cy="12" r="2.8" className="fill-black/30" />
        {/* Lá mầm bên trái */}
        <path
          d="M 12 12 C 9 9.5 5 9.5 4 12 C 5 14.5 9 14.5 12 12 Z"
          fill="#4ade80"
          className={animate ? "flower-leaf" : ""}
          style={{ transformOrigin: "12px 12px" }}
        />
        {/* Lá mầm bên phải */}
        <path
          d="M 12 12 C 15 9.5 19 9.5 20 12 C 19 14.5 15 14.5 12 12 Z"
          fill="#22c55e"
          className={animate ? "flower-leaf" : ""}
          style={{ transformOrigin: "12px 12px", animationDelay: "0.15s" }}
        />
        {/* Điểm gân lá mầm */}
        <path d="M 6.5 12 L 12 12 L 17.5 12" stroke="#16a34a" strokeWidth="0.8" opacity="0.6" />
        {/* Chồi tâm xanh mướt */}
        <circle cx="12" cy="12" r="1.4" fill="#86efac" />
      </svg>
    );
  }

  // Stage 2: Nụ hoa - 4 phiến lá xòe 4 hướng và búp nụ tròn ở trung tâm nhìn từ trên xuống
  if (stage === 2) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} overflow-visible`}
        aria-hidden="true"
        fill="none"
      >
        {/* 4 phiến lá xòe 4 hướng xung quanh nụ */}
        <g className={animate ? "flower-leaf" : ""} style={{ transformOrigin: "12px 12px" }}>
          <ellipse cx="6" cy="12" rx="4.5" ry="2.2" fill="#16a34a" />
          <ellipse cx="18" cy="12" rx="4.5" ry="2.2" fill="#16a34a" />
          <ellipse cx="12" cy="6" rx="2.2" ry="4.5" fill="#22c55e" />
          <ellipse cx="12" cy="18" rx="2.2" ry="4.5" fill="#22c55e" />
        </g>
        {/* Búp nụ hoa tròn nhìn từ trên xuống */}
        <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 12px" }}>
          {/* Đài hoa xanh ôm quanh nụ */}
          <circle cx="12" cy="12" r="5" fill="#15803d" />
          {/* Nụ hoa bầu màu hồng đỏ thắm */}
          <circle cx="12" cy="12" r="3.8" fill="#e11d48" />
          {/* Cánh nụ e ấp khép vào tâm */}
          <path d="M 12 8.2 C 9.8 10 9.8 14 12 15.8 C 14.2 14 14.2 10 12 8.2 Z" fill="#fb7185" />
          <circle cx="12" cy="12" r="1.6" fill="#fda4af" />
        </g>
      </svg>
    );
  }

  // Stage 3: Hoa nở rực rỡ nhìn thẳng từ trên xuống (Top-down bloom)
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible ${animate ? "flower-sparkle" : ""}`}
      aria-hidden="true"
      fill="none"
    >
      {/* 4 chóp lá xanh lấp ló bên dưới cánh hoa */}
      <g opacity="0.9">
        <ellipse cx="4.5" cy="4.5" rx="3.5" ry="1.8" transform="rotate(-45 4.5 4.5)" fill="#16a34a" />
        <ellipse cx="19.5" cy="4.5" rx="3.5" ry="1.8" transform="rotate(45 19.5 4.5)" fill="#16a34a" />
        <ellipse cx="4.5" cy="19.5" rx="3.5" ry="1.8" transform="rotate(45 4.5 19.5)" fill="#16a34a" />
        <ellipse cx="19.5" cy="19.5" rx="3.5" ry="1.8" transform="rotate(-45 19.5 19.5)" fill="#16a34a" />
      </g>
      {/* Đóa hoa 5 cánh xòe tròn đều quanh tâm nhìn từ trên xuống */}
      <g className={animate ? "flower-petal" : ""} style={{ transformOrigin: "12px 12px" }}>
        {[0, 72, 144, 216, 288].map((deg, i) => (
          <g key={i} transform={`rotate(${deg} 12 12)`}>
            <path
              d="M 12 12 C 9.2 8.5 8 3.8 10.6 2.2 C 11.4 2.8 12 3.2 12.6 2.8 C 15.2 3.8 14 8.5 12 12 Z"
              fill={i % 2 === 0 ? "#f43f5e" : "#fb7185"}
            />
          </g>
        ))}
        {/* Tâm hoa và nhụy hoa vàng rực rỡ */}
        <circle cx="12" cy="12" r="3.4" fill="#be123c" />
        <circle cx="12" cy="12" r="2.2" fill="#fef08a" />
        <circle cx="12" cy="12" r="1.2" fill="#f59e0b" />
        <circle cx="11.2" cy="11.2" r="0.6" fill="#ffffff" />
      </g>
    </svg>
  );
});

GardenFlower.displayName = "GardenFlower";
