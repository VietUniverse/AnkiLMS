import React from "react";
import {
  UtensilsCrossed,
  Target,
  MessageSquare,
  Clapperboard,
  Languages,
  Plane,
  Factory,
  Layers,
  LucideIcon,
} from "lucide-react";

export const DECK_ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Target,
  MessageSquare,
  Clapperboard,
  Languages,
  Plane,
  Factory,
};

export type DeckIconName = keyof typeof DECK_ICON_MAP;

interface DeckIconProps {
  name?: string;
  className?: string;
}

export const DeckIcon: React.FC<DeckIconProps> = ({ name, className = "w-5 h-5" }) => {
  const IconComponent = (name && DECK_ICON_MAP[name]) ? DECK_ICON_MAP[name] : Layers;
  return <IconComponent className={className} />;
};
