'use server';
/**
 * @fileOverview An AI assistant that summarizes course topics or generates practice questions
 *               based on content snippets from the course outline.
 *
 * - examPrepAIAssistant - A function that handles the AI assistant's tasks.
 * - ExamPrepAIAssistantInput - The input type for the examPrepAIAssistant function.
 * - ExamPrepAIAssistantOutput - The return type for the examPrepAIAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const ExamPrepAIAssistantInputSchema = z.object({
  task: z.enum(['summarize', 'generate_questions']).describe('The task for the AI: either "summarize" a topic or "generate_questions" from a content snippet.'),
  topicOrSnippet: z.string().describe('The specific course topic to summarize or the content snippet to generate questions from.'),
  contextOutline: z.string().optional().describe('Optional: The full course outline or broader context related to the topic/snippet.'),
});
export type ExamPrepAIAssistantInput = z.infer<typeof ExamPrepAIAssistantInputSchema>;

// Output Schema
const ExamPrepAIAssistantOutputSchema = z.object({
  responseType: z.enum(['summary', 'practice_questions']).describe('Indicates whether the output is a summary or practice questions.'),
  content: z.string().describe('The generated summary or the practice questions formatted as markdown.'),
});
export type ExamPrepAIAssistantOutput = z.infer<typeof ExamPrepAIAssistantOutputSchema>;

// Wrapper function
export async function examPrepAIAssistant(input: ExamPrepAIAssistantInput): Promise<ExamPrepAIAssistantOutput> {
  return examPrepAIAssistantFlow(input);
}

// Prompt definition
const examPrepAIAssistantPrompt = ai.definePrompt({
  name: 'examPrepAIAssistantPrompt',
  input: { schema: ExamPrepAIAssistantInputSchema },
  output: { schema: ExamPrepAIAssistantOutputSchema, format: 'json' },
  prompt: `You are an expert NSCA CPSS instructor and AI assistant. Your goal is to help prospective students understand the value of the CPSS Exam Prep Course by either summarizing course topics or generating practice questions. You MUST output a JSON object matching the provided schema.

Course Outline Context (if available):
{{#if contextOutline}}
{{{contextOutline}}}
{{else}}
No additional course outline context provided.
{{/if}}

---

{{#ifEq task "summarize"}}
  Please provide a concise and informative summary of the following content snippet. Highlight key concepts and their relevance to the NSCA CPSS exam. Ensure the summary is suitable for a prospective student.

  Content to summarize: "{{{topicOrSnippet}}}"

  Example JSON Output:
  {
    "responseType": "summary",
    "content": "A concise summary of the topic, highlighting key concepts for the CPSS exam."
  }
{{/ifEq}}

{{#ifEq task "generate_questions"}}
  Please generate 3-5 challenging multiple-choice practice questions based on the following content snippet. Each question should have 4 options (A, B, C, D) and clearly indicate the correct answer by appending "(Correct)" to the correct option. Focus on applying concepts rather than rote memorization. Format the questions clearly using markdown.

  Content to generate questions from: "{{{topicOrSnippet}}}"

  Example JSON Output:
  {
    "responseType": "practice_questions",
    "content": "### Question 1\nWhat is the primary purpose of needs analysis in sport science?\nA. To determine an athlete's financial background\nB. To identify physiological and biomechanical demands of a sport (Correct)\nC. To create a psychological profile of an athlete\nD. To assess an athlete's social media presence\n\n### Question 2\nWhich of the following best describes acute monitoring?\nA. Long-term tracking of athlete development\nB. Daily or session-by-session assessment of an athlete's response to training (Correct)\nC. Annual performance testing\nD. Post-career health evaluations"
  }
{{/ifEq}}`,
});

// Flow definition
const examPrepAIAssistantFlow = ai.defineFlow(
  {
    name: 'examPrepAIAssistantFlow',
    inputSchema: ExamPrepAIAssistantInputSchema,
    outputSchema: ExamPrepAIAssistantOutputSchema,
  },
  async (input) => {
    // Call the prompt with the input
    const { output } = await examPrepAIAssistantPrompt(input);
    
    // The model is instructed to output JSON directly, so 'output' should already be parsed.
    if (!output) {
      throw new Error('AI assistant failed to generate a response.');
    }
    return output;
  }
);
