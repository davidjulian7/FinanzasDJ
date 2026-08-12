"use client";

import {
  Landmark,
  Wallet,
  Banknote,
  CreditCard,
  TrendingUp,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Clapperboard,
  ShoppingBag,
  Tv,
  Plane,
  GraduationCap,
  PiggyBank,
  Laptop,
  Gift,
  HandCoins,
  Tag,
  Phone,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Landmark,
  Wallet,
  Banknote,
  CreditCard,
  TrendingUp,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Clapperboard,
  ShoppingBag,
  Tv,
  Plane,
  GraduationCap,
  PiggyBank,
  Laptop,
  Gift,
  HandCoins,
  Tag,
  Phone,
  Dumbbell,
};

export function IconByName({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const C = ICONS[name] ?? Tag;
  return <C className={className} style={style} />;
}
