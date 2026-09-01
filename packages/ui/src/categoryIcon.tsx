import React from 'react';
import {
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Plane,
  Laptop,
  Zap,
  HeartPulse,
  Banknote,
  Tag,
  Briefcase,
  TrendingUp,
  Shield,
  CreditCard,
  Building,
  GraduationCap,
  Sparkles,
  Gift,
  HelpCircle,
  LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  home: Home,
  housing: Home,
  'shopping-cart': ShoppingCart,
  shopping: ShoppingCart,
  groceries: ShoppingCart,
  utensils: Utensils,
  dining: Utensils,
  restaurant: Utensils,
  car: Car,
  transport: Car,
  plane: Plane,
  travel: Plane,
  leisure: Plane,
  laptop: Laptop,
  tech: Laptop,
  subscriptions: Laptop,
  zap: Zap,
  utilities: Zap,
  'heart-pulse': HeartPulse,
  health: HeartPulse,
  banknote: Banknote,
  salary: Banknote,
  income: Banknote,
  briefcase: Briefcase,
  work: Briefcase,
  'trending-up': TrendingUp,
  investment: TrendingUp,
  shield: Shield,
  insurance: Shield,
  'credit-card': CreditCard,
  building: Building,
  education: GraduationCap,
  gift: Gift,
  tag: Tag,
};

export interface CategoryIconProps extends LucideProps {
  name: string;
}

export function CategoryIcon({ name, strokeWidth = 1.5, size = 16, className, ...props }: CategoryIconProps) {
  const normalizedKey = (name || 'tag').toLowerCase().trim();
  const IconComponent = ICON_MAP[normalizedKey] || Tag;

  return <IconComponent size={size} strokeWidth={strokeWidth} className={className} {...props} />;
}
