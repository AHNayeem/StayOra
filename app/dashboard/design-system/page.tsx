"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, MoreHorizontal, Download } from "lucide-react";
import { PermissionGuard } from "@/features/dashboard/rbac/permission-guard";
import {
  PageHeader,
  Panel,
  PanelHeader,
  PanelBody,
  PanelFooter,
  Button,
  Badge,
  StatusBadge,
  Alert,
  Switch,
  Input,
  Select,
  Textarea,
  Checkbox,
  RadioGroup,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  FormSection,
  FormGrid,
  FormRow,
  FormActions,
  ChartCard,
  TrendChart,
  CategoryBarChart,
  CHART_COLORS,
  FilterBar,
  FilterChips,
  DataTable,
  TablePagination,
  StatCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  SkeletonText,
  ErrorState,
  PermissionDenied,
  type ColumnDef,
  type SortState,
  type StatusTone,
} from "@/features/dashboard/ui";
import { z } from "zod";
import {
  useQuery,
  useMutation,
  ApiError,
  getErrorMessage,
  type QueryStatus,
  type MutationStatus,
} from "@/features/dashboard/data";
import { useZodForm, applyServerErrors } from "@/features/dashboard/forms";
import { emailSchema, requiredString } from "@/features/dashboard/schemas";

/**
 * Design-system gallery — a living reference for the Phase 2 component library,
 * used to review states and interactions in one place. Gated by `system:read`.
 * The sample rows below are demo-only (component showcase), not business data.
 */
interface DemoRow {
  id: string;
  reference: string;
  guest: string;
  status: { label: string; tone: StatusTone };
  amount: number;
}

const DEMO_ROWS: DemoRow[] = [
  { id: "1", reference: "BK-1042", guest: "Amara Okafor", status: { label: "Confirmed", tone: "success" }, amount: 320 },
  { id: "2", reference: "BK-1043", guest: "Liam Chen", status: { label: "Pending", tone: "warning" }, amount: 145 },
  { id: "3", reference: "BK-1044", guest: "Sofia Rossi", status: { label: "Cancelled", tone: "danger" }, amount: 0 },
  { id: "4", reference: "BK-1045", guest: "Noah Williams", status: { label: "Confirmed", tone: "success" }, amount: 512 },
  { id: "5", reference: "BK-1046", guest: "Yuki Tanaka", status: { label: "Refunded", tone: "neutral" }, amount: 88 },
];

const DEMO_CHART_DATA = [
  { month: "Jan", thisYear: 32_000, lastYear: 26_500, bookings: 820 },
  { month: "Feb", thisYear: 29_500, lastYear: 27_800, bookings: 760 },
  { month: "Mar", thisYear: 38_200, lastYear: 30_100, bookings: 940 },
  { month: "Apr", thisYear: 41_600, lastYear: 33_400, bookings: 1_020 },
  { month: "May", thisYear: 46_900, lastYear: 35_900, bookings: 1_180 },
  { month: "Jun", thisYear: 52_300, lastYear: 39_200, bookings: 1_310 },
];

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/** Demo form schema — showcases the Zod + react-hook-form validation layer. */
const demoFormSchema = z.object({
  name: requiredString,
  email: emailSchema,
});

const QUERY_STATUS_TONE: Record<QueryStatus, StatusTone> = {
  idle: "neutral",
  loading: "info",
  success: "success",
  error: "danger",
};

const MUTATION_STATUS_TONE: Record<MutationStatus, StatusTone> = {
  idle: "neutral",
  pending: "info",
  success: "success",
  error: "danger",
};

/**
 * Phase 3 data-layer demo — exercises the in-house query cache, mutations and
 * the Zod-validated form against stub fetchers (simulated latency, no backend).
 * A "simulate failure" toggle flips reads/writes to error states so every
 * branch is reviewable in one place.
 */
function DataLayerDemo() {
  const [shouldFail, setShouldFail] = useState(false);

  // Read: the failure flag is part of the key, so toggling it refetches.
  const widgets = useQuery<string[]>({
    queryKey: ["demo", "widgets", shouldFail],
    queryFn: () =>
      new Promise<string[]>((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) reject(new ApiError({ kind: "server" }));
          else resolve(["Occupancy", "Revenue", "ADR", "RevPAR"]);
        }, 700);
      }),
  });

  // Write: succeeds, or fails with a conflict when the toggle is on.
  const save = useMutation<{ ok: true }, void>({
    mutationFn: () =>
      new Promise<{ ok: true }>((resolve, reject) => {
        setTimeout(
          () =>
            shouldFail
              ? reject(new ApiError({ kind: "conflict" }))
              : resolve({ ok: true }),
          700,
        );
      }),
  });

  const form = useZodForm(demoFormSchema, {
    defaultValues: { name: "", email: "" },
  });
  const onSubmit = form.handleSubmit(async () => {
    // Simulate a server-side validation error and map it onto the field.
    await new Promise((r) => setTimeout(r, 500));
    applyServerErrors(
      form.setError,
      new ApiError({
        kind: "validation",
        fieldErrors: { email: ["That email is already registered."] },
      }),
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          Data layer{" "}
          <span className="font-normal text-muted">(Phase 3)</span>
        </h2>
        <Button
          size="sm"
          variant={shouldFail ? "danger" : "outline"}
          onClick={() => setShouldFail((v) => !v)}
        >
          {shouldFail ? "Failure simulated" : "Simulate failure"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* useQuery */}
        <Panel flush className="lg:col-span-2">
          <PanelHeader
            title="useQuery"
            description="Cached read with loading, success and error states"
            actions={
              <div className="flex items-center gap-2">
                <StatusBadge tone={QUERY_STATUS_TONE[widgets.status]}>
                  {widgets.status}
                </StatusBadge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => widgets.refetch()}
                  loading={widgets.isFetching}
                >
                  Refetch
                </Button>
              </div>
            }
          />
          <PanelBody>
            {widgets.isLoading ? (
              <SkeletonText lines={4} />
            ) : widgets.isError ? (
              <ErrorState
                description={getErrorMessage(widgets.error)}
                onRetry={() => widgets.refetch()}
              />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {(widgets.data ?? []).map((w) => (
                  <li key={w}>
                    <Badge variant="neutral">{w}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        {/* useMutation */}
        <Panel flush>
          <PanelHeader
            title="useMutation"
            actions={
              <StatusBadge tone={MUTATION_STATUS_TONE[save.status]}>
                {save.status}
              </StatusBadge>
            }
          />
          <PanelBody>
            <p className="mb-3 text-sm text-body">
              {save.isError
                ? getErrorMessage(save.error)
                : save.isSuccess
                  ? "Saved successfully."
                  : "Run a write to see pending / success / error."}
            </p>
            <Button
              size="sm"
              onClick={() => save.mutate()}
              loading={save.isPending}
            >
              Save changes
            </Button>
          </PanelBody>
        </Panel>
      </div>

      {/* useZodForm */}
      <Panel>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          useZodForm — client + server validation
        </h3>
        <form onSubmit={onSubmit} noValidate>
          <FormGrid cols={2}>
            <Input
              label="Name"
              placeholder="Jane Doe"
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="jane@example.com"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />
          </FormGrid>
          <FormActions>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Submit
            </Button>
          </FormActions>
        </form>
      </Panel>
    </div>
  );
}

function GalleryContent() {
  const [alertOpen, setAlertOpen] = useState(true);
  const [notify, setNotify] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState | null>({ key: "reference", dir: "asc" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [plan, setPlan] = useState("monthly");

  const rows = useMemo(() => {
    const filtered = DEMO_ROWS.filter(
      (r) =>
        r.guest.toLowerCase().includes(search.toLowerCase()) ||
        r.reference.toLowerCase().includes(search.toLowerCase()),
    );
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === "amount") return (a.amount - b.amount) * dir;
      const av = String(a[sort.key as "reference" | "guest"]);
      const bv = String(b[sort.key as "reference" | "guest"]);
      return av.localeCompare(bv) * dir;
    });
  }, [search, sort]);

  const onSortChange = (key: string) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const columns: ColumnDef<DemoRow>[] = [
    { id: "reference", header: "Reference", sortable: true, cell: (r) => <span className="font-medium text-ink">{r.reference}</span> },
    { id: "guest", header: "Guest", sortable: true, cell: (r) => r.guest },
    { id: "status", header: "Status", cell: (r) => <StatusBadge tone={r.status.tone}>{r.status.label}</StatusBadge> },
    { id: "amount", header: "Amount", sortable: true, align: "right", cell: (r) => `$${r.amount.toFixed(2)}` },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "w-px",
      cell: () => (
        <DropdownMenu
          label="Row actions"
          trigger={({ props }) => (
            <button
              type="button"
              aria-label="Row actions"
              className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              {...props}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          )}
        >
          <DropdownItem icon={<Pencil />}>Edit</DropdownItem>
          <DropdownItem icon={<Download />}>Export</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<Trash2 />} danger>Delete</DropdownItem>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Design system"
        description="Phase 2 component library — states and interactions in one place."
      />

      <div className="flex flex-col gap-10">
        {/* Buttons */}
        <Panel>
          <h2 className="mb-4 text-base font-semibold text-ink">Buttons</h2>
          <div className="flex flex-col gap-3">
            <Row>
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
            </Row>
            <Row>
              <Button size="sm" leftIcon={<Plus className="size-4" />}>Small</Button>
              <Button leftIcon={<Plus className="size-4" />}>Add item</Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </Row>
          </div>
        </Panel>

        {/* Badges & status */}
        <Panel>
          <h2 className="mb-4 text-base font-semibold text-ink">Badges &amp; status</h2>
          <Row>
            <Badge>Primary</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="outline">Outline</Badge>
            <span className="mx-2 h-5 w-px bg-line" />
            <StatusBadge tone="success">Active</StatusBadge>
            <StatusBadge tone="warning">Pending</StatusBadge>
            <StatusBadge tone="danger">Suspended</StatusBadge>
            <StatusBadge tone="info">Info</StatusBadge>
            <StatusBadge tone="neutral">Archived</StatusBadge>
          </Row>
        </Panel>

        {/* Alerts */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-ink">Alerts</h2>
          <Alert tone="info" title="Heads up">Feature flags control which modules appear.</Alert>
          <Alert tone="success" title="Saved">Your changes have been saved.</Alert>
          <Alert tone="warning" title="Approaching limit">You&apos;re using 90% of your quota.</Alert>
          {alertOpen && (
            <Alert tone="danger" title="Payment failed" onDismiss={() => setAlertOpen(false)}>
              We couldn&apos;t process the last payout. Retry from the finance module.
            </Alert>
          )}
        </div>

        {/* Panel with header/body/footer */}
        <Panel flush>
          <PanelHeader
            title="Panel"
            description="Header, body and footer regions"
            actions={<Button size="sm" variant="outline">Action</Button>}
          />
          <PanelBody>
            <p className="text-sm text-body">
              Panels are the dashboard surface primitive: bordered, elevated
              containers for grouping content.
            </p>
          </PanelBody>
          <PanelFooter>
            <Button size="sm" variant="ghost">Cancel</Button>
            <Button size="sm">Save</Button>
          </PanelFooter>
        </Panel>

        {/* Form */}
        <Panel>
          <h2 className="mb-2 text-base font-semibold text-ink">Form</h2>
          <FormSection title="Profile" description="Basic account details.">
            <FormGrid cols={2}>
              <Input label="First name" placeholder="Jane" defaultValue="Jane" />
              <Input label="Last name" placeholder="Doe" />
              <Input label="Email" type="email" required placeholder="jane@example.com" />
              <Select label="Role" placeholder="Select a role" options={[
                { label: "Admin", value: "admin" },
                { label: "Staff", value: "staff" },
              ]} />
            </FormGrid>
            <Input label="Website" error="Enter a valid URL." defaultValue="not-a-url" />
            <Textarea label="Bio" hint="A short description." placeholder="Tell us about yourself" />
          </FormSection>
          <FormSection title="Preferences" description="Notifications and access.">
            <FormRow label="Email notifications" hint="Receive booking updates by email.">
              <Switch checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            </FormRow>
            <Checkbox label="I agree to the terms" defaultChecked />
            <RadioGroup
              name="plan"
              label="Plan"
              options={[
                { label: "Monthly", value: "monthly" },
                { label: "Annual", value: "annual" },
              ]}
              value={plan}
              onChange={setPlan}
            />
          </FormSection>
          <FormActions>
            <Button variant="ghost">Cancel</Button>
            <Button>Save changes</Button>
          </FormActions>
        </Panel>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Revenue"
            description="This year vs last year"
            legend={[
              { label: "This year", colorClass: "bg-primary" },
              { label: "Last year", colorClass: "bg-accent" },
            ]}
          >
            <TrendChart
              data={DEMO_CHART_DATA}
              xKey="month"
              series={[
                { key: "thisYear", label: "This year", color: CHART_COLORS.primary, type: "area" },
                { key: "lastYear", label: "Last year", color: CHART_COLORS.accent, type: "line" },
              ]}
              height={240}
              leftTickFormatter={(v) => `$${Math.round(v / 1000)}k`}
            />
          </ChartCard>
          <ChartCard title="Bookings">
            <CategoryBarChart
              data={DEMO_CHART_DATA}
              xKey="month"
              valueKey="bookings"
              label="Bookings"
              height={240}
            />
          </ChartCard>
        </div>

        {/* Table */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ink">Data table</h2>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search bookings…"
            actions={<Button size="sm" leftIcon={<Plus className="size-4" />}>New booking</Button>}
          />
          <FilterChips
            filters={[{ key: "status", label: "Status: Confirmed" }]}
            onRemove={() => {}}
            onClear={() => {}}
          />
          <DataTable
            caption="Demo bookings"
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            sort={sort}
            onSortChange={onSortChange}
            selectable
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={DEMO_ROWS.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Skeletons */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ink">Loading skeletons</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartSkeleton className="lg:col-span-2" />
            <TableSkeleton rows={4} columns={3} />
          </div>
        </div>

        <DataLayerDemo />
      </div>
    </>
  );
}

export default function DesignSystemPage() {
  return (
    <PermissionGuard anyPermission={["system:read"]} fallback={<PermissionDenied />}>
      <GalleryContent />
    </PermissionGuard>
  );
}
