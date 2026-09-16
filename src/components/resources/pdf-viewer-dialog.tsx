"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen custom PDF reader window.
 *
 * Uses the browser's native PDF engine inside an <iframe> (zoom, page
 * navigation, in-frame search and print all come for free) wrapped in a
 * custom chrome that adds explicit Download / Print / Open-in-new-tab
 * actions, a loading state, and a graceful fallback for browsers that
 * cannot render PDFs inline.
 */

export interface PdfViewerState {
  url: string;
  title: string;
}

interface PdfViewerDialogProps {
  pdf: PdfViewerState | null;
  onClose: () => void;
}

/** Derive a friendly file name from a URL (path, no query/hash). */
function fileNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url, window.location.origin);
    const name = decodeURIComponent(pathname.split("/").pop() || "document");
    return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
  } catch {
    return "document.pdf";
  }
}

export function PdfViewerDialog({ pdf, onClose }: PdfViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [inlineUnsupported, setInlineUnsupported] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "busy" | "failed">("idle");

  // Reset transient state each time a new document is opened.
  useEffect(() => {
    setIsLoading(true);
    setInlineUnsupported(false);
    setDownloadState("idle");
  }, [pdf?.url]);

  // Prevent background scrolling while the viewer is open.
  useEffect(() => {
    if (!pdf) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [pdf]);

  const handleDownload = useCallback(async () => {
    if (!pdf) return;
    const fileName = fileNameFromUrl(pdf.url);
    setDownloadState("busy");
    try {
      const response = await fetch(pdf.url, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadState("idle");
    } catch {
      // CORS or network failure — fall back to a plain tab so the user
      // can still save via the browser viewer.
      window.open(pdf.url, "_blank", "noopener,noreferrer");
      setDownloadState("failed");
    }
  }, [pdf]);

  const handlePrint = useCallback(() => {
    if (!pdf) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = pdf.url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(pdf.url, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => iframe.remove(), 60_000);
    };
    document.body.appendChild(iframe);
  }, [pdf]);

  const handleOpenInNewTab = useCallback(() => {
    if (!pdf) return;
    window.open(pdf.url, "_blank", "noopener,noreferrer");
  }, [pdf]);

  if (!pdf) return null;

  // #view=FitH fits the page width; the browser viewer keeps its own
  // zoom/page controls in-frame.
  const viewerSrc = `${pdf.url}${pdf.url.includes("#") ? "" : "#view=FitH"}`;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex h-[95vh] w-[95vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          {/* Toolbar */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                <FileText className="h-4 w-4" />
              </span>
              <DialogPrimitive.Title className="truncate text-sm font-semibold sm:text-base">
                {pdf.title}
              </DialogPrimitive.Title>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={downloadState === "busy"}
                className="gap-1.5 rounded-lg text-white hover:bg-white/15 hover:text-white"
                title="Download PDF"
              >
                {downloadState === "busy" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {downloadState === "failed" ? "Open to save" : "Download"}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 rounded-lg text-white hover:bg-white/15 hover:text-white"
                title="Print PDF"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-1.5 rounded-lg text-white hover:bg-white/15 hover:text-white"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden md:inline">New tab</span>
              </Button>

              <DialogPrimitive.Close
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
                title="Close"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Viewer body */}
          <div className="relative flex-1 bg-slate-100">
            {isLoading && !inlineUnsupported && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="text-sm text-slate-500">Loading document…</p>
              </div>
            )}

            {inlineUnsupported ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200">
                  <FileText className="h-7 w-7 text-slate-500" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">
                    This PDF can&apos;t be shown inline
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Your browser doesn&apos;t support embedded PDF viewing.
                  </p>
                </div>
                <Button onClick={handleOpenInNewTab} className="gap-2 rounded-full">
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            ) : (
              <iframe
                key={pdf.url}
                src={viewerSrc}
                title={pdf.title}
                className="h-full w-full border-0"
                onLoad={() => setIsLoading(false)}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * True when a URL points at a PDF — used to decide whether a resource click
 * opens the custom reader instead of a new browser tab. Query strings are
 * ignored so signed Storage URLs (…alt=media&token=…) still match.
 */
export function isPdfUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url, window.location.origin);
    return pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().includes(".pdf");
  }
}
