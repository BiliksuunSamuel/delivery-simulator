"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  extra?: ReactNode;
  size?: "default" | "sm";
}

export function EntityActionsMenu({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  extra,
  size = "default",
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={size === "sm" ? "icon-sm" : "icon"}
            aria-label="Actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> {editLabel}
          </DropdownMenuItem>
        )}
        {extra}
        {onDelete && (
          <>
            {(onEdit || extra) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-[var(--color-brand-coral)] focus:text-[var(--color-brand-coral)]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> {deleteLabel}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
