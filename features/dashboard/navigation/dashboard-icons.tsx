import {
  BadgePercent,
  Bell,
  Boxes,
  CalendarCheck,
  CircleHelp,
  CircleUser,
  FileBarChart,
  Globe,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  LineChart,
  type LucideIcon,
  type LucideProps,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Dashboard icon registry.
 *
 * Menu/config data stores icon *names* as strings (JSON-safe, DB-drivable),
 * mirroring components/shared/lucide-icon. Register every icon the dashboard
 * navigation references here; unknown names fall back to a neutral glyph.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  LineChart,
  CalendarCheck,
  Boxes,
  Store,
  Users,
  Wallet,
  BadgePercent,
  FileBarChart,
  LayoutTemplate,
  Star,
  Globe,
  UserCog,
  ShieldCheck,
  KeyRound,
  SlidersHorizontal,
  LifeBuoy,
  CircleUser,
  Bell,
  MessageSquare,
  CircleHelp,
};

interface DashboardIconProps extends LucideProps {
  /** Registered icon name (e.g. "Wallet"). */
  name: string;
}

/** Render a dashboard icon by name; falls back to a neutral glyph if unmapped. */
export function DashboardIcon({ name, ...props }: DashboardIconProps) {
  const Cmp = ICON_MAP[name] ?? Sparkles;
  return <Cmp {...props} />;
}
