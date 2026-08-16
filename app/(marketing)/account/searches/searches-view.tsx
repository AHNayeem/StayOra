"use client";

import { useState } from "react";
import Link from "next/link";
import { BellOff, BellRing, Search, Trash2, TrendingDown } from "lucide-react";
import {
  clearPriceAlert,
  dropPercent,
  getRevision,
  removeSavedSearch,
  savedSearchService,
  setAlertStatus,
  setPriceAlert,
  subscribe,
  type SavedSearch,
} from "@/features/dashboard/domain";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useSyncExternalStore } from "react";
import { toast } from "@/lib/toast";

/**
 * Saved searches and price alerts.
 *
 * Reads the domain store live: the `alerts:price` job runs while the dashboard
 * is open, so a triggered alert appears here without a refresh. Every action
 * goes through `savedSearchService`, never at the store directly.
 */
export function SavedSearchesView() {
  const { user } = useAuth();
  const { money, date } = useLocale();
  const revision = useSyncExternalStore(subscribe, getRevision, () => 0);
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [target, setTarget] = useState("");

  // `revision` is the subscription; the read below is what it guards.
  void revision;
  const searches = user ? savedSearchService.forCustomer(user.email) : [];

  const watching = searches.filter((s) => s.alert?.status === "watching").length;
  const triggered = searches.filter((s) => s.alert?.status === "triggered").length;

  function openEditor(search: SavedSearch) {
    setEditing(search);
    setTarget(String(search.alert?.targetUsd ?? (Math.round(search.lastCheapestUsd * 0.9) || 1)));
  }

  function saveTarget() {
    if (!editing) return;
    const parsed = Number(target);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a target above zero");
      return;
    }
    setPriceAlert(editing.id, parsed);
    setEditing(null);
    toast.success("Alert updated", {
      description: `We'll write to you at ${money(parsed)} or less.`,
    });
  }

  return (
    <div>
      <AccountPageHeader
        title="Saved searches"
        description={
          searches.length > 0
            ? `${searches.length} saved · ${watching} being watched${triggered ? ` · ${triggered} triggered` : ""}`
            : "Keep a search and we'll tell you when the price drops."
        }
      />

      {searches.length === 0 ? (
        <AccountEmpty
          icon={Search}
          title="No saved searches yet"
          description="Filter any listing page the way you like it, then press “Save search”. Add a price alert and we'll write to you when a match reaches your target."
          action={
            <Link href="/hotels" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Browse hotels
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {searches.map((search) => {
            const alert = search.alert;
            const drop = alert ? dropPercent(alert, search.lastCheapestUsd) : 0;
            const met =
              alert && search.lastCheapestUsd > 0 && search.lastCheapestUsd <= alert.targetUsd;

            return (
              <li
                key={search.id}
                className="rounded-panel border border-line bg-surface p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={search.href}
                        className="truncate text-sm font-semibold text-ink hover:text-primary"
                      >
                        {search.label}
                      </Link>
                      {alert?.status === "triggered" && (
                        <Badge variant="success">Target met</Badge>
                      )}
                      {alert?.status === "paused" && <Badge variant="neutral">Paused</Badge>}
                      {alert?.status === "watching" && <Badge variant="primary">Watching</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {search.lastResultCount}{" "}
                      {search.lastResultCount === 1 ? "match" : "matches"}
                      {search.lastCheapestUsd > 0
                        ? ` · from ${money(search.lastCheapestUsd)}`
                        : ""}
                      {" · checked "}
                      {date(search.lastRunAt)}
                    </p>
                    {alert && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={met ? "font-medium text-emerald-600" : "text-body"}>
                          Target {money(alert.targetUsd)}
                        </span>
                        {drop > 0 && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <TrendingDown className="size-3.5" aria-hidden="true" />
                            {drop}% below {money(alert.baselineUsd)} when you set it
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={search.href}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Run search
                    </Link>
                    {alert ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEditor(search)}>
                          <BellRing className="size-4" aria-hidden="true" />
                          Edit alert
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = alert.status === "paused" ? "watching" : "paused";
                            setAlertStatus(search.id, next);
                            toast.info(next === "paused" ? "Alert paused" : "Alert resumed");
                          }}
                        >
                          {alert.status === "paused" ? (
                            <BellRing className="size-4" aria-hidden="true" />
                          ) : (
                            <BellOff className="size-4" aria-hidden="true" />
                          )}
                          {alert.status === "paused" ? "Resume" : "Pause"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            clearPriceAlert(search.id);
                            toast.info("Alert removed — the search is still saved");
                          }}
                        >
                          Stop watching
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => openEditor(search)}>
                        <BellRing className="size-4" aria-hidden="true" />
                        Add price alert
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${search.label}`}
                      className="text-danger hover:bg-danger/10"
                      onClick={() => {
                        removeSavedSearch(search.id);
                        toast.info("Saved search removed");
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Price alert"
        description={editing?.label}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveTarget}>
              Save alert
            </Button>
          </div>
        }
      >
        <Input
          label="Tell me when it's at or below (USD)"
          type="number"
          min={1}
          step="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          hint={
            editing && editing.lastCheapestUsd > 0
              ? `Cheapest match today is ${money(editing.lastCheapestUsd)}.`
              : "Nothing matches this search right now."
          }
        />
      </Modal>
    </div>
  );
}
