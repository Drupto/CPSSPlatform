"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import type { FlashcardStudyStatus } from "@/lib/types";

export interface StudyCard {
  resourceId: string;
  front: string;
  back: string;
  title: string;
}

export interface StudySessionProps {
  courseTitle: string;
  cards: StudyCard[];
  /** Study state per card id (absent key = not yet studied). */
  states: Record<string, FlashcardStudyStatus>;
  /** Deck index to open on (resume). Ignored in review mode. */
  startIndex: number;
  /** When true, only cards currently marked "review" are studied. */
  reviewOnly?: boolean;
  /** Persists a study-state change for a card. */
  onStateChange: (resourceId: string, state: FlashcardStudyStatus) => void;
  /** Called whenever the card being looked at changes (resume point). */
  onPositionChange: (resourceId: string) => void;
  onClose: () => void;
}

type SessionMode = "all" | "review";

function buildOrder(cards: StudyCard[], states: Record<string, FlashcardStudyStatus>, mode: SessionMode): number[] {
  const indices = cards.map((_, i) => i);
  if (mode === "review") {
    return indices.filter((i) => states[cards[i].resourceId] === "review");
  }
  return indices;
}

function shuffledIndices(indices: number[]): number[] {
  const copy = [...indices];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const STATE_BADGES: Record<FlashcardStudyStatus, { label: string; className: string }> = {
  seen: { label: "Seen", className: "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200" },
  known: { label: "Known", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  review: { label: "Review again", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

export function StudySession({
  courseTitle,
  cards,
  states,
  startIndex,
  reviewOnly = false,
  onStateChange,
  onPositionChange,
  onClose,
}: StudySessionProps) {
  const [mode, setMode] = useState<SessionMode>(reviewOnly ? "review" : "all");
  const [isShuffled, setIsShuffled] = useState(false);
  const [order, setOrder] = useState<number[]>(() => buildOrder(cards, states, reviewOnly ? "review" : "all"));
  const [position, setPosition] = useState(() =>
    reviewOnly ? 0 : Math.min(Math.max(startIndex, 0), Math.max(cards.length - 1, 0)),
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const stats = useMemo(() => {
    let known = 0;
    let review = 0;
    let seen = 0;
    for (const card of cards) {
      const state = states[card.resourceId];
      if (state === "known") known++;
      else if (state === "review") review++;
      else if (state === "seen") seen++;
    }
    return { known, review, seen, unstudied: cards.length - known - review - seen };
  }, [cards, states]);

  const currentCard = order[position] !== undefined ? cards[order[position]] : null;
  const currentResourceId = currentCard?.resourceId ?? null;
  const currentState = currentResourceId ? states[currentResourceId] ?? null : null;

  // Keep the latest callback in a ref so the resume-point effect below does
  // not re-fire (or refire writes) whenever the parent re-renders.
  const positionCbRef = useRef(onPositionChange);
  positionCbRef.current = onPositionChange;

  useEffect(() => {
    if (!currentResourceId || showSummary) return;
    positionCbRef.current(currentResourceId);
  }, [currentResourceId, showSummary]);

  const flipCard = useCallback(() => {
    if (!currentCard) return;
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    // The first flip already counts as "seen" — progress is tracked even when
    // the student never makes a known/review decision for the card.
    if (nextFlipped && !states[currentCard.resourceId]) {
      onStateChange(currentCard.resourceId, "seen");
    }
  }, [currentCard, isFlipped, states, onStateChange]);

  const goNext = useCallback(() => {
    setIsFlipped(false);
    if (position >= order.length - 1) {
      setShowSummary(true);
      return;
    }
    setPosition((p) => Math.min(p + 1, order.length - 1));
  }, [order.length, position]);

  const goPrev = useCallback(() => {
    setIsFlipped(false);
    setShowSummary(false);
    setPosition((p) => Math.max(p - 1, 0));
  }, []);

  const decide = useCallback(
    (state: FlashcardStudyStatus) => {
      if (!currentCard) return;
      onStateChange(currentCard.resourceId, state);
      goNext();
    },
    [currentCard, onStateChange, goNext],
  );

  const applyOrder = useCallback(
    (nextMode: SessionMode, nextShuffled: boolean) => {
      const base = buildOrder(cards, states, nextMode);
      setOrder(nextShuffled ? shuffledIndices(base) : base);
      setMode(nextMode);
      setPosition(0);
      setIsFlipped(false);
      setShowSummary(false);
    },
    [cards, states],
  );

  const toggleShuffle = useCallback(() => {
    applyOrder(mode, !isShuffled);
    setIsShuffled(!isShuffled);
  }, [applyOrder, mode, isShuffled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (showSummary) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        flipCard();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipCard, goNext, goPrev, onClose, showSummary]);

  const studied = cards.length - stats.unstudied;
  const progressValue = cards.length > 0 ? (studied / cards.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
              Study Session
            </div>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-zinc-100 sm:text-xl">
              {courseTitle}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close study session">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5 sm:p-6">
          {/* Live deck stats + overall progress */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className={STATE_BADGES.known.className}>Known: {stats.known}</Badge>
            <Badge className={STATE_BADGES.review.className}>Review: {stats.review}</Badge>
            <Badge className={STATE_BADGES.seen.className}>Seen: {stats.seen}</Badge>
            <Badge variant="outline">Unseen: {stats.unstudied}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShuffle}
              className="ml-auto gap-2"
              aria-pressed={isShuffled}
            >
              <Shuffle className="h-4 w-4" />
              {isShuffled ? "Shuffled" : "In order"}
            </Button>
          </div>
          <Progress value={progressValue} className="h-2" aria-label="Deck study progress" />
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
            {studied} of {cards.length} cards studied
            {mode === "review" ? " • review round" : ""}
          </p>

          {showSummary ? (
            <div className="mt-8 rounded-[20px] border border-slate-200 p-8 text-center dark:border-white/10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-zinc-100">Session complete</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                {stats.known} known • {stats.review} to review again • {stats.seen} seen • {stats.unstudied} not studied
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {mode === "all" && stats.review > 0 && (
                  <Button onClick={() => applyOrder("review", false)} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Study {stats.review} review card{stats.review === 1 ? "" : "s"}
                  </Button>
                )}
                {mode === "review" && (
                  <Button onClick={() => applyOrder("all", isShuffled)} className="gap-2">
                    Back to full deck
                  </Button>
                )}
                <Button variant="outline" onClick={onClose}>
                  Done for now
                </Button>
              </div>
            </div>
          ) : !currentCard ? (
            <div className="mt-8 rounded-[20px] border border-slate-200 p-8 text-center dark:border-white/10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Nothing to review</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                No cards are currently marked for review.
              </p>
              <Button className="mt-6" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 flex justify-center">
                <Badge
                  className={
                    currentState
                      ? STATE_BADGES[currentState].className
                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }
                >
                  {currentState ? STATE_BADGES[currentState].label : "Not studied"}
                </Badge>
              </div>
              <div className="perspective-1000 mt-3">
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isFlipped}
                  aria-label={`Flashcard ${position + 1} of ${order.length}: ${currentCard.title}`}
                  onClick={flipCard}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flipCard();
                    }
                  }}
                  className={`flip-card-3d relative h-[300px] w-full cursor-pointer select-none rounded-[20px] shadow-lg transition-transform duration-700 sm:h-[360px] ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  <div className="card-face rounded-[20px] border border-slate-200 dark:border-white/10 bg-gradient-to-br from-white to-slate-100 dark:from-zinc-900 dark:to-zinc-800 p-6 sm:p-8">
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                        Front
                      </p>
                      <p className="mt-3 break-words text-base font-semibold text-slate-900 dark:text-zinc-100 sm:text-xl">
                        {currentCard.front}
                      </p>
                      <p className="mt-4 text-xs text-slate-500 dark:text-zinc-400">{currentCard.title}</p>
                    </div>
                  </div>

                  <div className="card-face rotate-y-180 overflow-y-auto rounded-[20px] border border-indigo-500/30 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white sm:p-8">
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                        Back
                      </p>
                      <p className="mt-3 break-words text-base font-semibold sm:text-xl">{currentCard.back}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-zinc-800">Tap card to flip</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-zinc-800">Space / Arrow keys • Esc closes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={goPrev} disabled={position === 0} className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button variant="outline" onClick={flipCard} className="gap-2">
                    <Play className="h-4 w-4" />
                    {isFlipped ? "Show Front" : "Show Back"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => decide("review")}
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Review again
                  </Button>
                  <Button onClick={() => decide("known")} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Check className="h-4 w-4" />
                    Got it
                  </Button>
                  <Button variant="outline" onClick={goNext} className="gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}