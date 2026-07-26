"use client";

import { useState } from "react";
import { Plus, Power } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Tabs } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import {
  useCurrencies,
  useDeleteCurrency,
  useDeleteLanguage,
  useLanguages,
  useUpdateCurrency,
  useUpdateLanguage,
} from "./hooks";
import { CurrencyForm, LanguageForm } from "./forms";
import type { Currency, Language } from "./types";

function LanguagesPanel() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Language | null>(null);
  const [deleting, setDeleting] = useState<Language | null>(null);
  const update = useUpdateLanguage();
  const del = useDeleteLanguage();

  const list = useLanguages((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["localization:update"]}
      deletePermission={["localization:delete"]}
      extra={
        <Can anyPermission={["localization:update"]}>
          <DropdownItem
            icon={<Power />}
            onSelect={() =>
              void update.mutateAsync({ id: row.id, input: { enabled: !row.enabled } })
            }
          >
            {row.enabled ? "Disable" : "Enable"}
          </DropdownItem>
        </Can>
      }
    />
  ));

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Language>
        list={list}
        searchPlaceholder="Search language or code…"
        selectable={false}
        primaryAction={
          <Can anyPermission={["localization:create"]}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add language
            </Button>
          </Can>
        }
        caption="Languages"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit language" : "Add language"}
      >
        {(creating || editing) && (
          <LanguageForm
            initial={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete language?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be removed from the platform.
          </>
        }
        confirmLabel="Delete language"
      />
    </>
  );
}

function CurrenciesPanel() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [deleting, setDeleting] = useState<Currency | null>(null);
  const update = useUpdateCurrency();
  const del = useDeleteCurrency();

  const list = useCurrencies((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["localization:update"]}
      deletePermission={["localization:delete"]}
      extra={
        <Can anyPermission={["localization:update"]}>
          <DropdownItem
            icon={<Power />}
            onSelect={() =>
              void update.mutateAsync({ id: row.id, input: { enabled: !row.enabled } })
            }
          >
            {row.enabled ? "Disable" : "Enable"}
          </DropdownItem>
        </Can>
      }
    />
  ));

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Currency>
        list={list}
        searchPlaceholder="Search currency or code…"
        selectable={false}
        primaryAction={
          <Can anyPermission={["localization:create"]}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add currency
            </Button>
          </Can>
        }
        caption="Currencies"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit currency" : "Add currency"}
      >
        {(creating || editing) && (
          <CurrencyForm
            initial={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete currency?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be removed from the platform.
          </>
        }
        confirmLabel="Delete currency"
      />
    </>
  );
}

/** Localization — languages and currencies reference tables under tabs. */
export function Localization() {
  return (
    <Tabs
      items={[
        { key: "languages", label: "Languages", content: <LanguagesPanel /> },
        { key: "currencies", label: "Currencies", content: <CurrenciesPanel /> },
      ]}
    />
  );
}
