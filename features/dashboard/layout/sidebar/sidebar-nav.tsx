"use client";

import { Fragment } from "react";
import type { ResolvedMenuNode } from "../../navigation/types";
import { useShell } from "../shell-context";
import { SidebarNavItem } from "./sidebar-nav-item";

interface SidebarNavProps {
  tree: ResolvedMenuNode[];
}

/**
 * Renders the resolved menu tree, inserting section headings before any
 * top-level node flagged `sectionStart`. Section labels hide when the sidebar
 * is collapsed to the icon rail.
 */
export function SidebarNav({ tree }: SidebarNavProps) {
  const { collapsed } = useShell();

  return (
    <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-0.5">
        {tree.map((node) => (
          <Fragment key={node.id}>
            {node.sectionStart &&
              (collapsed ? (
                <li aria-hidden="true" className="my-2 border-t border-line" />
              ) : (
                node.sectionLabel && (
                  <li
                    className="px-3 pb-1 pt-4 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted"
                    aria-hidden="true"
                  >
                    {node.sectionLabel}
                  </li>
                )
              ))}
            <SidebarNavItem node={node} />
          </Fragment>
        ))}
      </ul>
    </nav>
  );
}

interface SidebarSearchResultsProps {
  results: ResolvedMenuNode[];
  query: string;
}

/** Flat filtered result list shown while the sidebar search has a query. */
export function SidebarSearchResults({ results, query }: SidebarSearchResultsProps) {
  return (
    <nav aria-label="Menu search results" className="flex-1 overflow-y-auto px-3 py-2">
      {results.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted">
          No menu items match “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {results.map((node) => (
            <SidebarNavItem key={node.id} node={{ ...node, depth: 0, children: undefined }} />
          ))}
        </ul>
      )}
    </nav>
  );
}
