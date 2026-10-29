import { Badge } from "@/components/ui/badge";

/**
 * Status → badge mapping shared across admin tables.
 * Warm palette only: espresso (primary) for active/live states, sand
 * (secondary) for in-progress, outline for quiet states, destructive red
 * only for cancelled/declined.
 */

const CONFIG: Record<string, { label: string; className: string }> = {
  // Appointment requests
  requested: {
    label: "Requested",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  confirmed: {
    label: "Confirmed",
    className: "border-transparent bg-primary text-primary-foreground",
  },
  rescheduled: {
    label: "Rescheduled",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-transparent bg-destructive text-white",
  },
  completed: { label: "Completed", className: "text-muted-foreground" },

  // Contact messages
  new: {
    label: "New",
    className: "border-transparent bg-primary text-primary-foreground",
  },
  read: { label: "Read", className: "text-muted-foreground" },
  archived: { label: "Archived", className: "text-muted-foreground" },

  // Editorial content
  draft: {
    label: "Draft",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  published: {
    label: "Published",
    className: "border-transparent bg-primary text-primary-foreground",
  },
  archived_content: { label: "Archived", className: "text-muted-foreground" },

  // Consent
  pending: {
    label: "Consent pending",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  approved: {
    label: "Consent approved",
    className: "border-transparent bg-primary text-primary-foreground",
  },
  declined: {
    label: "Consent declined",
    className: "border-transparent bg-destructive text-white",
  },
};

export function StatusBadge({ status }: { status: string }) {
  // "archived" is shared by messages and content — same quiet look either way.
  const cfg = CONFIG[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}
