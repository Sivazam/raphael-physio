"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "../_lib/client";

interface StatusOption {
  value: string;
  label: string;
}

/**
 * Inline status selector for content rows (draft/published/archived, …).
 * Applies immediately via PATCH and refreshes the server-rendered list.
 */
export function StatusSelect({
  endpoint,
  id,
  value,
  options,
  extraPayload,
  ariaLabel,
  className,
}: {
  endpoint: string; // e.g. "/api/admin/services/"
  id: string;
  value: string;
  options: readonly StatusOption[];
  extraPayload?: Record<string, unknown>;
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState(value);

  async function handleChange(next: string) {
    const previous = current;
    setCurrent(next);
    setPending(true);
    try {
      await apiFetch(`${endpoint}${id}`, "PATCH", {
        status: next,
        ...extraPayload,
      });
      const label = options.find((o) => o.value === next)?.label ?? next;
      toast.success(`Status updated to “${label}”.`);
      router.refresh();
    } catch (err) {
      setCurrent(previous);
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      value={current}
      onValueChange={handleChange}
      disabled={pending}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={`h-8 w-[130px] ${className ?? ""}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
