import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Testimonials() {
  const testimonials = [
    {
      quote: "The Practice Exam Pack helped me focus on the right topics – it was a game-changer for my prep!",
      author: "Anand",
      location: "Gwalior",
      rating: 5
    },
    {
      quote: "I passed the CSCS exam on my first try thanks to the comprehensive videos and quizzes.",
      author: "Neha",
      location: "Lucknow",
      rating: 5
    },
    {
      quote: "The 1-on-1 live session in the Ultimate Bundle gave me the confidence boost I needed.",
      author: "Rajat",
      location: "Mumbai",
      rating: 5
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

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="p-8 rounded-[2rem] border-slate-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {/* Star Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-slate-700 text-lg leading-relaxed mb-6 flex-grow italic">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="border-t border-slate-200 pt-6">
                <p className="font-bold text-slate-900">{testimonial.author}</p>
                <p className="text-slate-500 text-sm">{testimonial.location}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Video Testimonial Placeholder */}
        <div className="mt-16">
          <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-300 p-16 text-center">
            <svg className="w-20 h-20 mx-auto mb-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Video Testimonials Coming Soon</h3>
            <p className="text-slate-600 max-w-xl mx-auto">
              We're collecting video testimonials from our successful students. Check back soon to see real students share their experiences and success stories.
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8 italic">
          *These are representative testimonials. We'll update with verified student feedback soon.*
        </p>
      </div>
    </section>
  );
}
