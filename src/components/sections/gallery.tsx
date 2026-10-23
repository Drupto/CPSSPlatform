"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

const thumbnailSizes =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw";

const galleryImages: GalleryImage[] = [
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1792576632/hybrid_r3cd1g.jpg",
    alt: "Hybrid performance coaching session",
    width: 1600,
    height: 900,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1792576632/hybrid2_sy94ow.jpg",
    alt: "Hybrid athlete conditioning workout",
    width: 900,
    height: 1600,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860869/1_m5r5qi.jpg",
    alt: "Strength and conditioning training",
    width: 1200,
    height: 1600,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860869/5_qiqnvh.jpg",
    alt: "KINÉTIKA coaching in action",
    width: 1280,
    height: 720,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860868/4_xrxzna.jpg",
    alt: "Performance training with kettlebells",
    width: 1156,
    height: 1600,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860868/7_gnpjoa.jpg",
    alt: "Athletes training in the gym",
    width: 1280,
    height: 1188,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860868/8_zndno4.jpg",
    alt: "Functional fitness session",
    width: 960,
    height: 1280,
  },
  {
    src: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860868/6_rt9dtw.jpg",
    alt: "Strength training session",
    width: 591,
    height: 1280,
  },
];

const navButtonClasses =
  "h-11 w-11 rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 hover:text-white focus-visible:ring-white/60";

export function Gallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const isOpen = activeIndex !== null;
  const activeImage = activeIndex !== null ? galleryImages[activeIndex] : null;

  // Shrink-wrap the lightbox to the photo's own aspect ratio so portrait and
  // landscape shots both use the available screen space without heavy bars.
  const lightboxMaxWidth = activeImage
    ? `min(95vw, 72rem, calc((72vh - 5rem) * ${(
        activeImage.width / activeImage.height
      ).toFixed(4)} + 5rem))`
    : undefined;

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null
        ? current
        : (current - 1 + galleryImages.length) % galleryImages.length
    );
  }, []);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % galleryImages.length
    );
  }, []);

  // Arrow-key browsing while the lightbox is open (Radix traps focus inside it).
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showPrevious, showNext]);

  return (
    <section className="py-24 bg-white dark:bg-zinc-950" id="gallery">
      <div className="container max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 dark:bg-primary/20 dark:hover:bg-primary/20">
            Gallery
          </Badge>
          <h2 className="text-4xl font-extrabold mb-4">Inside KINÉTIKA</h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto dark:text-zinc-400">
            Moments from our training floor, coaching sessions and hybrid
            performance programs. Tap any photo to view it full size.
          </p>
        </div>

        <Carousel className="relative" opts={{ loop: true, align: "start" }}>
          <CarouselContent>
            {galleryImages.map((image, index) => (
              <CarouselItem
                key={image.src}
                className="basis-full sm:basis-1/2 lg:basis-1/4"
              >
                <button
                  type="button"
                  aria-label={`View "${image.alt}" full size`}
                  onPointerDown={(event) => {
                    pointerStart.current = {
                      x: event.clientX,
                      y: event.clientY,
                    };
                  }}
                  onClick={(event) => {
                    const start = pointerStart.current;
                    pointerStart.current = null;

                    // Ignore the click that ends a carousel drag/swipe.
                    if (
                      start &&
                      event.detail > 0 &&
                      Math.hypot(
                        event.clientX - start.x,
                        event.clientY - start.y
                      ) > 8
                    ) {
                      return;
                    }

                    setActiveIndex(index);
                  }}
                  className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10"
                >
                  <div className="relative aspect-[4/5] w-full">
                    {/* Blurred copy of the photo fills the letterbox area so
                        portrait and landscape shots share the same frame size. */}
                    <Image
                      src={image.src}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes={thumbnailSizes}
                      className="scale-110 object-cover opacity-30 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes={thumbnailSizes}
                      className="object-contain"
                    />
                  </div>

                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Maximize2 className="h-4 w-4 text-white" />
                  </span>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="left-3 h-10 w-10 border-white/20 bg-white/80 text-zinc-900 shadow-lg backdrop-blur hover:bg-white dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-900" />
          <CarouselNext className="right-3 h-10 w-10 border-white/20 bg-white/80 text-zinc-900 shadow-lg backdrop-blur hover:bg-white dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-900" />
        </Carousel>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setActiveIndex(null);
          }
        }}
      >
        <DialogContent
          style={{ maxWidth: lightboxMaxWidth }}
          className="w-[95vw] gap-0 overflow-hidden border-white/10 bg-zinc-950 p-0 text-white sm:rounded-2xl [&>button]:rounded-full [&>button]:bg-black/50 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100"
        >
          <DialogTitle className="sr-only">
            {activeImage?.alt ?? "Gallery image"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-size gallery image. Use the arrow keys or the on-screen arrows
            to browse, and press Escape to close.
          </DialogDescription>

          <div className="relative h-[68vh] w-full sm:h-[72vh]">
            {activeImage ? (
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                sizes="95vw"
                priority
                className="object-contain p-3 sm:p-10"
              />
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={showPrevious}
              aria-label="Previous image"
              className={`absolute left-2 top-1/2 z-10 -translate-y-1/2 ${navButtonClasses}`}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={showNext}
              aria-label="Next image"
              className={`absolute right-2 top-1/2 z-10 -translate-y-1/2 ${navButtonClasses}`}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-zinc-300">{activeImage?.alt}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {(activeIndex ?? 0) + 1} / {galleryImages.length}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
