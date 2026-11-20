import React from "react";

export type FlowerTheme = "sunflower" | "rose" | "tulip" | "lotus";

interface GardenFlowerProps {
  stage: 0 | 1 | 2 | 3; // 0: Đất trống, 1: Mầm, 2: Nụ, 3: Hoa
  theme?: FlowerTheme;
  className?: string;
  animate?: boolean;
}

const FLOWER_SPRITE_PREFIX: Record<FlowerTheme, string> = {
  sunflower: "sunflower",
  rose: "Rose", // File Rose_01.png has uppercase R
  tulip: "tulip",
  lotus: "lotus",
};

/**
 * GardenFlower: Pixel-art garden sprites inspired by Shigeyuki's New Cards Farm.
 * - Stage 0: Ô đất vuông trống (dấu rãnh gieo mầm tối giản).
 * - Stage 1: Mầm non (_01.png).
 * - Stage 2: Nụ hoa (_02.png).
 * - Stage 3: Hoa nở rực rỡ (_03.png).
 */
export const GardenFlower: React.FC<GardenFlowerProps> = React.memo(
  ({ stage, theme = "sunflower", className = "w-full h-full", animate = true }) => {
    // Stage 0: Ô đất trống chờ gieo mầm
    if (stage === 0) {
      return (
        <span
          className="w-1.5 h-1.5 rounded-sm bg-stone-500/25 dark:bg-stone-400/25 block pointer-events-none select-none transition-opacity"
          aria-hidden="true"
        />
      );
    }

    const prefix = FLOWER_SPRITE_PREFIX[theme] || "sunflower";
    const stageNum = stage === 1 ? "01" : stage === 2 ? "02" : "03";
    const spritePath = `/farm/Garden/${prefix}_${stageNum}.png`;
    const label = stage === 1 ? "Mầm non" : stage === 2 ? "Nụ hoa" : "Hoa nở rực rỡ";

    return (
      <img
        src={spritePath}
        alt={label}
        width={32}
        height={32}
        loading="lazy"
        draggable={false}
        className={`pixelated object-contain select-none pointer-events-none ${className} ${
          animate && stage === 3 ? "animate-pulse" : ""
        }`}
      />
    );
  }
);

GardenFlower.displayName = "GardenFlower";
