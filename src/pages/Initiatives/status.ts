import type { InitiativeStatus } from "@/types/initiatives";

export const STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
};

// Mirrors STATUS_TRANSITIONS in the backend's initiative_service.py
export const STATUS_TRANSITIONS: Record<InitiativeStatus, InitiativeStatus[]> = {
  PLANNED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ACTIVE", "CANCELLED"],
  COMPLETED: ["ACTIVE"],
  CANCELLED: ["PLANNED"],
};

export const STATUS_STYLES: Record<InitiativeStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  ACTIVE: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
};
