import type React from "react";

/**
 * Props cho <div> đóng vai nút (card bấm được): Tab tới được, Enter/Space kích hoạt.
 * Dùng thay cho onClick trần để card không còn là vùng chỉ chuột mới dùng được.
 */
export function activateProps(onActivate: () => void) {
  return {
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
  } as const;
}
