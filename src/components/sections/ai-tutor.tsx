
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, BookOpen, PenTool } from "lucide-react";
import { examPrepAIAssistant } from "@/ai/flows/exam-prep-ai-assistant";
import { useToast } from "@/hooks/use-toast";

const TOPICS = [
  { id: "needs-analysis", label: "Needs Analysis in Sport", content: "Needs analysis involves identifying the physiological and biomechanical demands of a sport, as well as an athlete's strengths and weaknesses relative to those demands." },
  { id: "training-load", label: "Acute:Chronic Workload Ratio", content: "The ACWR is a tool used to monitor training load and assess athlete readiness, typically calculated as the ratio of current workload (7 days) to long-term workload (28 days)." },
  { id: "periodization", label: "Block Periodization", content: "Block periodization involves breaking training cycles into concentrated blocks focusing on specific physiological traits, aiming to maximize adaptation for high-level athletes." },
  { id: "tech-gps", label: "GPS Tracking in Team Sports", content: "GPS technology allows sport scientists to track movement patterns, velocity, and distance covered to objectively measure external training load and match demands." }
];

export function AITutor() {
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0].id);
  const [response, setResponse] = useState<{ content: string; type: string } | null>(null);
  const { toast } = useToast();

  const handleAction = async (task: "summarize" | "generate_questions") => {
    setLoading(true);
    setResponse(null);
    try {
      const topic = TOPICS.find(t => t.id === selectedTopic);
      if (!topic) return;

      const result = await examPrepAIAssistant({
        task,
        topicOrSnippet: topic.content,
        contextOutline: "NSCA CSCS Exam Content Outline: Scientific Foundations and Practical/Applied domains."
      });

      setResponse({ content: result.content, type: result.responseType });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to generate response. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 bg-white border-y">
      <div className="container max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="lg:w-1/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" />
              GenAI Assistant
            </div>
            <h2 className="text-4xl font-extrabold mb-6 leading-tight">
              Get a Glimpse Into the <span className="text-primary">Course Value</span>
            </h2>
            <p className="text-slate-600 text-lg mb-8">
              Test drive our educational methodology. Select a topic and let our 
              AI Assistant either summarize the key exam concepts or generate 
              challenging practice questions for you.
            </p>
            <div className="space-y-4">
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAction("summarize")} 
                  disabled={loading}
                  className="flex-1 rounded-xl h-12"
                  variant="outline"
                >
                  <BookOpen className="mr-2 w-4 h-4" />
                  Summarize
                </Button>
                <Button 
                  onClick={() => handleAction("generate_questions")} 
                  disabled={loading}
                  className="flex-1 rounded-xl h-12"
                >
                  <PenTool className="mr-2 w-4 h-4" />
                  Quiz Me
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:w-2/3 w-full">
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden min-h-[400px] flex flex-col bg-slate-900 text-slate-100">
              <CardHeader className="border-b border-white/5 bg-slate-800/50 p-8">
                <CardTitle className="flex items-center gap-3">
                  {loading ? "Generating Intelligence..." : response ? (response.type === "summary" ? "Topic Summary" : "Practice Questions") : "Ready for Input"}
                  {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Powered by Gemini Pro - Our NSCA CSCS Training Model
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex-1 overflow-auto bg-slate-900/40">
                {loading ? (
                  <div className="h-full flex flex-col justify-center items-center space-y-4 opacity-50">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="animate-pulse">Synthesizing sport science literature...</p>
                  </div>
                ) : response ? (
                  <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-primary whitespace-pre-wrap">
                    {response.content}
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center space-y-4 py-12">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-primary/40" />
                    </div>
                    <p className="text-slate-400 max-w-xs text-lg">
                      Pick a topic and choose an action to start your AI-powered study session.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
