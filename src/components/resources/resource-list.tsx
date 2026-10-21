"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  Search,
} from "lucide-react";
import { getResourceIcon, getResourceTypeBadge } from "@/components/resources/resource-display";
import { isPdfUrl } from "@/components/resources/pdf-viewer-dialog";
import type { CourseContentItem } from "@/lib/types";

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "document", label: "Documents" },
  { value: "video", label: "Videos" },
  { value: "link", label: "Links" },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];

interface ResourceListProps {
  /** Non-flashcard resources loaded so far (pagination accumulates). */
  resources: CourseContentItem[];
  viewedIds: Record<string, true>;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onToggleViewed: (resourceId: string, viewed: boolean) => void;
  onOpenUrl: (url?: string, title?: string) => void;
  /** Optional custom empty state message when resources.length === 0. */
  emptyMessage?: string;
}

/**
 * Searchable, filterable, paginated list of a course's document/video/link
 * resources with a per-row "mark as done" toggle backed by per-user state.
 */
export function ResourceList({
  resources,
  viewedIds,
  loadingMore,
  hasMore,
  onLoadMore,
  onToggleViewed,
  onOpenUrl,
  emptyMessage,
}: ResourceListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const availableTypes = useMemo(
    () => TYPE_FILTERS.filter((f) => f.value === "all" || resources.some((r) => r.type === f.value)),
    [resources],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!needle) return true;
      return r.title.toLowerCase().includes(needle) || (r.body ?? "").toLowerCase().includes(needle);
    });
  }, [resources, search, typeFilter]);

  return (
    <div className="space-y-3">
      {/* Search + type filters (cover everything loaded so far) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            className="pl-9"
            aria-label="Search resources"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableTypes.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              aria-pressed={typeFilter === filter.value}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === filter.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-3">
          {visible.map((resource) => {
            const viewed = Boolean(viewedIds[resource.id]);
            return (
              <div
                key={resource.id}
                className={`flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-zinc-800 ${
                  viewed ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleViewed(resource.id, !viewed)}
                    aria-label={viewed ? `Mark "${resource.title}" as not done` : `Mark "${resource.title}" as done`}
                    aria-pressed={viewed}
                    className="mt-0.5 shrink-0"
                  >
                    {viewed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300 dark:text-zinc-600" />
                    )}
                  </button>
                  {getResourceIcon(resource.type)}
                  <div>
                    <h3 className={`font-medium text-slate-900 dark:text-zinc-100 ${viewed ? "line-through" : ""}`}>
                      {resource.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{resource.body}</p>
                    {getResourceTypeBadge(resource.type)}
                  </div>
                </div>
                {resource.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenUrl(resource.url, resource.title)}
                  >
                    {isPdfUrl(resource.url) ? "Read" : resource.type === "document" ? "Download" : "Open"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="italic text-slate-500 dark:text-zinc-400">
          {resources.length === 0
            ? emptyMessage || "No resources available for this course yet."
            : "No resources match your search."}
        </p>
      )}

      {hasMore && (
        <Button variant="outline" onClick={onLoadMore} disabled={loadingMore} className="w-full gap-2">
          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
          Load more
        </Button>
      )}
      {resources.length > 0 && !hasMore && (
        <p className="text-center text-xs text-slate-400 dark:text-zinc-500">All resources loaded</p>
      )}
    </div>
  );
}