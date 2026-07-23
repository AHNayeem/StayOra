import {
  Award,
  BadgePercent,
  Bath,
  BedDouble,
  Building2,
  Bus,
  CalendarCheck,
  CalendarDays,
  Car,
  Clock,
  FileText,
  Compass,
  Globe,
  Headphones,
  Heart,
  Landmark,
  LayoutGrid,
  Leaf,
  type LucideIcon,
  type LucideProps,
  MapPin,
  Maximize,
  Medal,
  Mountain,
  Plane,
  Route,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Tag,
  ThumbsUp,
  Ticket,
  Timer,
  Trophy,
  Users,
  Utensils,
  Waves,
} from "lucide-react";

/**
 * Generic Lucide resolver for content configs (features, stats, detail specs).
 * Like {@link VerticalIcon} it keeps config files serialisable by storing icon
 * *names* as strings; register any icon used by content here.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  BadgePercent,
  ShieldCheck,
  Headphones,
  CalendarCheck,
  Users,
  Building2,
  Globe,
  Star,
  // About / values
  Award,
  Heart,
  Leaf,
  // Home marketing bands (inspiration themes, awards)
  Compass,
  Landmark,
  Medal,
  Mountain,
  Plane,
  Sun,
  ThumbsUp,
  Trophy,
  Waves,
  // Detail-template specs
  Bath,
  BedDouble,
  Bus,
  CalendarDays,
  Car,
  Clock,
  FileText,
  LayoutGrid,
  MapPin,
  Maximize,
  Route,
  Ruler,
  Tag,
  Ticket,
  Timer,
  Utensils,
};

interface LucideIconProps extends LucideProps {
  /** Registered icon name (e.g. "ShieldCheck"). */
  name: string;
}

/** Render a Lucide icon by name; falls back to a neutral glyph if unmapped. */
export function Icon({ name, ...props }: LucideIconProps) {
  const Cmp = ICON_MAP[name] ?? Sparkles;
  return <Cmp {...props} />;
}
