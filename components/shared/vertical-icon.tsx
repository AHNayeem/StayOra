import {
  BedDouble,
  Building2,
  BusFront,
  Landmark,
  type LucideIcon,
  type LucideProps,
  Map,
  Palmtree,
  StickyNote,
  Ticket,
  Users,
} from "lucide-react";

/**
 * Maps the `icon` string in {@link VERTICALS} to a concrete Lucide component.
 * Keeping the registry as strings (serialisable) and resolving here means the
 * config file stays free of JSX and can be shared with any runtime.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  BedDouble,
  Building2,
  Palmtree,
  Users,
  Landmark,
  BusFront,
  Map,
  Ticket,
  StickyNote,
};

interface VerticalIconProps extends LucideProps {
  /** Icon name from a vertical config (e.g. "BedDouble"). */
  name: string;
}

/** Render a vertical's Lucide icon by name. Returns null if unmapped. */
export function VerticalIcon({ name, ...props }: VerticalIconProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
