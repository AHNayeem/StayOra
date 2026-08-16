"use client";

import { useState } from "react";
import { Languages, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  DICTIONARIES,
  translationKeys,
  translationCoverage,
} from "@/features/i18n/dictionaries";
import { localeSettings, setTranslation } from "@/features/i18n/locale-settings";
import { Alert, Button, Input, Select, StatCard } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { LANGUAGES } from "@/constants/geo";

/**
 * Translation editor — where a language stops being a promise.
 *
 * Every string the site can translate is listed here with its shipped
 * translation and an editable override. Saving writes to the same store the
 * public site's `t()` reads, so the change is live on the next render — no
 * deploy, no second copy of the copy.
 *
 * Coverage is measured from this list, which is why the languages table can no
 * longer claim a number it cannot back up.
 */
export function TranslationsPanel() {
  const [language, setLanguage] = useState("ar");
  const [filter, setFilter] = useState("");
  const [, force] = useState(0);

  const settings = localeSettings();
  const keys = translationKeys();
  const overrides = settings.overrides[language] ?? {};
  const shipped = DICTIONARIES[language] ?? {};
  const coverage = Math.round(translationCoverage(language) * 100);

  const rows = keys.filter((key) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return (
      key.toLowerCase().includes(needle) ||
      (overrides[key] ?? shipped[key] ?? "").toLowerCase().includes(needle)
    );
  });

  const save = (key: string, value: string) => {
    setTranslation(language, key, value);
    force((n) => n + 1);
  };

  const translated = keys.filter((key) => overrides[key] ?? shipped[key]).length;
  const edited = Object.keys(overrides).length;

  const languageOptions = LANGUAGES.filter((l) => l.code !== "en").map((l) => ({
    value: l.code,
    label: `${l.name} (${l.code})`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Strings" value={String(keys.length)} icon="Type" />
        <StatCard label="Translated" value={String(translated)} icon="Languages" />
        <StatCard label="Coverage" value={`${coverage}%`} icon="Gauge" />
        <StatCard label="Edited here" value={String(edited)} icon="Pencil" />
      </div>

      <Alert tone="info" title="Edits are live">
        Saving a string changes the public site immediately for that language. English is
        the source: it is never edited here, it *is* the key.
      </Alert>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Language"
          options={languageOptions}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          wrapperClassName="w-56"
        />
        <Input
          label="Filter"
          placeholder="Search source or translation…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          wrapperClassName="min-w-56 flex-1"
        />
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Translations</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 w-1/3">English source</th>
              <th className="px-4 py-3">Translation</th>
              <th className="px-4 py-3 w-24">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((key) => {
              const current = overrides[key] ?? shipped[key] ?? "";
              const isOverride = key in overrides;
              return (
                <tr key={key} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-2 align-middle text-body">{key}</td>
                  <td className="px-4 py-2">
                    <Can
                      anyPermission={["localization:update"]}
                      fallback={<span className="text-body">{current || "—"}</span>}
                    >
                      <Input
                        aria-label={`Translation of “${key}”`}
                        defaultValue={current}
                        dir={language === "ar" || language === "ur" ? "rtl" : "ltr"}
                        onBlur={(e) => {
                          if (e.target.value !== current) {
                            save(key, e.target.value);
                            toast.saved("Translation");
                          }
                        }}
                      />
                    </Can>
                  </td>
                  <td className="px-4 py-2">
                    {isOverride ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={() => {
                          save(key, "");
                          toast.success("Reverted to the shipped translation");
                        }}
                      >
                        <RotateCcw className="size-3" aria-hidden="true" /> Edited
                      </button>
                    ) : current ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Languages className="size-3" aria-hidden="true" /> Shipped
                      </span>
                    ) : (
                      <span className="text-xs text-accent-600">Missing</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 200 && (
        <p className="text-center text-xs text-muted">
          Showing the first 200 of {rows.length} strings — filter to narrow the list.
        </p>
      )}

      <div className="flex justify-end">
        <Can anyPermission={["localization:update"]}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              for (const key of Object.keys(overrides)) setTranslation(language, key, "");
              force((n) => n + 1);
              toast.success("All edits reverted for this language");
            }}
            disabled={edited === 0}
          >
            Revert {edited} edit{edited === 1 ? "" : "s"}
          </Button>
        </Can>
      </div>
    </div>
  );
}
