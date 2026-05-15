
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, BookOpen, Target } from "lucide-react";

export function Authority() {
  const painPoints = [
    {
      title: "Overwhelmed by the Textbook",
      description: "600+ pages of dense sport science literature is a lot to digest. We break it down into actionable modules.",
      icon: <BookOpen className="w-10 h-10 text-primary" />,
    },
    {
      title: "Unsure what to Prioritize",
      description: "Don't waste time on concepts that aren't on the test. We focus on high-yield exam domains.",
      icon: <Target className="w-10 h-10 text-primary" />,
    },
    {
      title: "Fear of Case Studies",
      description: "Complex athlete and research scenarios are the hardest part. Our frameworks ensure you approach them systematically.",
      icon: <AlertCircle className="w-10 h-10 text-primary" />,
    },
  ];

  return (
    <section className="py-24 bg-white" id="course">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              The CSCS Exam is Hard. <br />
              Studying Doesn't Have to Be.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              With a demanding two-section exam and a curriculum that spans both 
              Scientific Foundations and Practical/Applied competencies, you need 
              more than rote memorization. Learn how to apply anatomy, physiology, 
              program design, exercise technique, and testing principles with confidence.
            </p>
          </div>

        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => (
            <Card key={index} className="border-none shadow-xl rounded-3xl bg-slate-50 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
              <CardContent className="p-8">
                <div className="mb-6 bg-white w-20 h-20 rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  {point.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{point.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {point.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
