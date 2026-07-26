"use client";

import { ArrowDown, ArrowUp, Power, PowerOff } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { useHomeBlocks, useMoveBlock, useSetBlockEnabled } from "./hooks";
import { HOME_BLOCK_COUNT } from "./service";
import type { HomeBlock } from "./types";

/**
 * Homepage Builder — the ordered list of storefront sections. Editors toggle
 * a section on/off and move it up/down; the reorder swap lives in the service
 * so a real backend persists the same `enabled` / `order` fields unchanged.
 */
export function HomepageList() {
  const setEnabled = useSetBlockEnabled();
  const moveBlock = useMoveBlock();

  const move = (row: HomeBlock, direction: -1 | 1) =>
    void moveBlock
      .mutateAsync({ id: row.id, direction })
      .then(() => toast.success(`Moved “${row.name}” ${direction < 0 ? "up" : "down"}`));

  const list = useHomeBlocks((row) => {
    const enabled = row.enabled;
    return (
      <Can anyPermission={["cms:update"]}>
        <RowActions
          label={`Actions for ${row.name}`}
          extra={
            <>
              <DropdownItem
                icon={<ArrowUp />}
                disabled={row.order <= 0}
                onSelect={() => move(row, -1)}
              >
                Move up
              </DropdownItem>
              <DropdownItem
                icon={<ArrowDown />}
                disabled={row.order >= HOME_BLOCK_COUNT - 1}
                onSelect={() => move(row, 1)}
              >
                Move down
              </DropdownItem>
              <DropdownItem
                icon={enabled ? <PowerOff /> : <Power />}
                onSelect={() =>
                  void setEnabled
                    .mutateAsync({ id: row.id, enabled: !enabled })
                    .then(() =>
                      toast.success(enabled ? "Section disabled" : "Section enabled"),
                    )
                }
              >
                {enabled ? "Disable" : "Enable"}
              </DropdownItem>
            </>
          }
        />
      </Can>
    );
  });

  return (
    <ResourceListView<HomeBlock>
      list={list}
      searchPlaceholder="Search sections…"
      selectable={false}
      enableColumnVisibility={false}
      caption="Homepage sections"
    />
  );
}
