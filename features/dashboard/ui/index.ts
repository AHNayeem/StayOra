/**
 * Dashboard design system — the single import surface for dashboard UI.
 *
 * It re-exports the shared marketing-grade primitives (so there's exactly one
 * of each, never a duplicate) alongside the dashboard-specific components built
 * for data-dense admin/merchant screens. Import everything from here:
 *
 *   import { Panel, DataTable, Button, StatusBadge } from "@/features/dashboard/ui";
 */

// ---- Shared primitives (re-exported, not duplicated) ----
export { Button, buttonVariants } from "@/components/ui/button";
export type { ButtonVariant, ButtonSize } from "@/components/ui/button";
export { Badge } from "@/components/ui/badge";
export type { BadgeVariant, BadgeSize } from "@/components/ui/badge";
export { Avatar } from "@/components/ui/avatar";
export type { AvatarSize } from "@/components/ui/avatar";
export { Tag } from "@/components/ui/tag";
export type { TagVariant } from "@/components/ui/tag";

export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { Select } from "@/components/ui/select";
export type { SelectOption } from "@/components/ui/select";
export { Checkbox } from "@/components/ui/checkbox";
export { RadioGroup } from "@/components/ui/radio-group";
export type { RadioOption } from "@/components/ui/radio-group";
export { FieldWrapper, controlClasses } from "@/components/ui/field";
export type { FieldOwnProps } from "@/components/ui/field";

export { Modal } from "@/components/ui/modal";
export type { ModalSize } from "@/components/ui/modal";
export { Drawer } from "@/components/ui/drawer";
export type { DrawerSide } from "@/components/ui/drawer";
export { Tabs } from "@/components/ui/tabs";
export type { TabItem, TabsVariant } from "@/components/ui/tabs";
export { Tooltip } from "@/components/ui/tooltip";
export type { TooltipSide } from "@/components/ui/tooltip";
export { Accordion } from "@/components/ui/accordion";
export type { AccordionItem } from "@/components/ui/accordion";
export { Pagination } from "@/components/ui/pagination";
export { Skeleton, SkeletonText } from "@/components/ui/skeleton";
export type { SkeletonVariant } from "@/components/ui/skeleton";

// ---- Dashboard-specific components (Phase 2) ----
export { Panel, PanelHeader, PanelBody, PanelFooter } from "./panel";
export { StatusBadge } from "./status-badge";
export type { StatusTone } from "./status-badge";
export { Alert } from "./alert";
export type { AlertTone } from "./alert";
export { Switch } from "./switch";
export {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from "./dropdown-menu";
export { FormSection, FormGrid, FormRow, FormActions } from "./form";
export { ChartCard } from "./chart-card";
export {
  TrendChart,
  CategoryBarChart,
  DonutChart,
  CHART_COLORS,
  compactNumber,
} from "./charts";
export type { ChartSeries, DonutSlice } from "./charts";
export { FilterBar, FilterChips } from "./filter-bar";
export type { ActiveFilter } from "./filter-bar";
export { DataTable } from "./data-table";
export type { ColumnDef, SortState, SortDir } from "./data-table";
export { TablePagination } from "./table-pagination";
export {
  StatCardSkeleton,
  CardSkeleton,
  ChartSkeleton,
  FormSkeleton,
  TableSkeleton,
} from "./skeletons";

// ---- Existing dashboard components (Phase 1) ----
export { StatCard } from "../components/stat-card";
export { PageHeader } from "../components/page-header";
export {
  StateView,
  EmptyState,
  NoResults,
  PermissionDenied,
  FeatureDisabled,
  OfflineState,
  ErrorState,
} from "../components/state-views";
