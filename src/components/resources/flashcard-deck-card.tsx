"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Loader2, Play, RotateCcw } from "lucide-react";
import type { FlashcardStudyStatus } from "@/lib/types";

interface FlashcardDeckCardProps {
  flashcardCount: number;
  /** Study state per card id (absent key = not yet studied). */
  states: Record<string, FlashcardStudyStatus>;
  /** True when a resume point exists for this deck. */
  hasResume: boolean;
  /** True while the deck is being fetched for a study session. */
  preparing: boolean;
  onStart: (mode: "all" | "review") => void;
}

/**
 * Collapsed representation of a course's whole flashcard deck. Instead of
 * listing every card as a row (thousands with large decks), this shows a
 * single card with study progress and the entry points into a study session.
 */
export function FlashcardDeckCard({ flashcardCount, states, hasResume, preparing, onStart }: FlashcardDeckCardProps) {
  let known = 0;
  let review = 0;
  for (const state of Object.values(states)) {
    if (state === "known") known++;
    else if (state === "review") review++;
  }
  const studied = Object.keys(states).length;
  const unseen = Math.max(flashcardCount - studied, 0);
  const progressValue = flashcardCount > 0 ? (studied / flashcardCount) * 100 : 0;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-zinc-100">Flashcard Deck</h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {flashcardCount} card{flashcardCount === 1 ? "" : "s"} • {studied} studied • {known} known •{" "}
              {review} to review
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-2"
            disabled={preparing || flashcardCount === 0}
            onClick={() => onStart("all")}
          >
            {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {hasResume ? "Continue studying" : "Start studying"}
          </Button>
          {review > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={preparing}
              onClick={() => onStart("review")}
            >
              <RotateCcw className="h-4 w-4" />
              Review ({review})
            </Button>
          )}
        </div>
      </div>
      <Progress value={progressValue} className="mt-3 h-2" aria-label="Deck study progress" />
      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
        {studied} of {flashcardCount} cards studied ({unseen} unseen)
      </p>
    </div>
  );
}