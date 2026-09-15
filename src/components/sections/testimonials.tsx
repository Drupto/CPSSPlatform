"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"

export function Testimonials() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const testimonials = [
    {
      quote: "Joining CSCS Prep Batch was one of the best decisions for my career. Before joining, I was confused about how to study for CSCS and the syllabus felt overwhelming, but the way Prakhar sir explains every topic with practical examples and scientific concepts made everything easy to understand. The best thing about this course is that it’s not just theory-based — every concept is connected with real-life strength & conditioning applications, which helped me build confidence as a coach. The study material, guidance, doubt-solving sessions, and structured preparation strategy kept me consistent throughout the journey. Prakhar sir’s teaching style, energy, and deep knowledge in strength & conditioning truly stand out. He genuinely wants every student to grow and succeed. I highly recommend Parmitrain’s CSCS Prep Batch to anyone who is serious about clearing CSCS and becoming a better coach professionally.",
      author: "Amarendra Singh",
      location: "India",
      rating: 5,
      image: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860494/Amarendra_Singh_fxrvoh.jpg",
    },
    {
      quote: "Prakhar Sir’s CSCS Preparation Course is truly one of the most well-structured and practical learning programs for aspiring strength & conditioning coaches. The way he breaks down difficult concepts into simple, understandable lessons makes learning very effective and engaging. What makes this course different is the balance between scientific knowledge and real-world application. Every session adds value not only for clearing CSCS but also for becoming a better coach professionally. The guidance, study strategy, doubt-solving, and consistent support throughout the preparation journey are exceptional. Prakhar Sir is highly knowledgeable, passionate, and genuinely dedicated to helping students grow. His teaching style keeps students motivated and confident throughout the process. I genuinely recommend Parmitrain’s CSCS Prep Batch to anyone serious about building a strong foundation in strength & conditioning and preparing for the CSCS exam with proper guidance.",
      author: "Tulika Singh",
      location: "India",
      rating: 5,
      image: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860494/Tulika_Singh_k3npmw.jpg",
    },
    {
      quote: "Joining Prakhar Sir’s CSCS Prep Batch helped me understand strength & conditioning concepts in a much deeper and practical way. The classes are very well-structured, easy to understand, and focused not only on clearing CSCS but also on improving coaching knowledge. Prakhar Sir’s guidance, support, and teaching style kept me motivated throughout the preparation journey. I would definitely recommend Parmitrain’s CSCS Prep Batch to every aspiring coach.",
      author: "Abdullah",
      location: "India",
      rating: 5,
      image: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860494/Abdullah_ya1ste.jpg",
    },
    {
      quote: "Prakhar Sir’s CSCS Prep Batch made my preparation very clear and structured. The practical teaching style, concept clarity, and constant guidance helped me improve both my knowledge and confidence as a coach. Highly recommended for anyone preparing for CSCS.",
      author: "Salman",
      location: "India",
      rating: 5,
      image: "https://res.cloudinary.com/dziccfxut/image/upload/v1778860494/Salman_zudjqg.jpg",
    }
  ];

  return (
    <section className="py-24 bg-white" id="testimonials">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Success Stories</Badge>
          <h2 className="text-4xl font-extrabold mb-4">What Our Students Say</h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Real feedback from students who achieved their goals with our courses.
          </p>
        </div>

        <Carousel className="relative" opts={{ loop: false, align: "start", containScroll: "trimSnaps" }}>
          <CarouselPrevious />
          <CarouselNext />

          <CarouselContent className="flex gap-8">
            {testimonials.map((testimonial, index) => {
              const previewLength = 220
              const isExpanded = expandedIndex === index
              const shouldShowButton = testimonial.quote.length > previewLength
              const displayedQuote = isExpanded
                ? testimonial.quote
                : `${testimonial.quote.slice(0, previewLength).trimEnd()}${shouldShowButton ? "..." : ""}`

              return (
                <CarouselItem key={index} className="pb-8">
                  <Card className="p-8 rounded-[2rem] border border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100 shadow-sm">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.author}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-2">
                          Student testimonial
                        </p>
                        <p className="text-xl font-semibold text-slate-950 leading-tight">
                          {testimonial.author}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{testimonial.location}</p>
                      </div>

                      <div className="rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 border border-slate-200">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="inline-block w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <div className="text-slate-700 text-base leading-8 mb-6">
                      <blockquote className="not-italic text-slate-800">
                        {displayedQuote}
                      </blockquote>
                    </div>

                    {shouldShowButton ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start px-4"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        {isExpanded ? "Show less" : "Read more"}
                      </Button>
                    ) : null}

                    <div className="mt-auto pt-6 border-t border-slate-200">
                      <p className="text-sm text-slate-500">CSCS Prep Batch alumni</p>
                    </div>
                  </Card>
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>

        <p className="text-center text-slate-500 text-sm mt-8 italic">
          *These are representative testimonials. We'll update with verified student feedback soon.*
        </p>
      </div>
    </section>
  );
}
