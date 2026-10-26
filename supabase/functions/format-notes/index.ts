import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const modePrompts: Record<string, string> = {
  simple: "Extract the key points as concise bullet points. Keep it brief.",
  detailed:
    "Extract key points, group them by topic with headings, include a summary, and flag any action items or warnings.",
  action:
    "Focus on extracting all actionable tasks and to-dos. Group them by priority. Also include a brief summary.",
  study:
    "Organize the content as study notes: create clear headings by topic, include definitions, key concepts, and important facts. Add a summary at the top.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText, mode } = await req.json();

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const modeInstruction = modePrompts[mode] || modePrompts.detailed;

    const systemPrompt = `You are a smart note-formatting AI. Given raw unstructured text, you must extract the important information and return structured notes as a JSON array of blocks.

${modeInstruction}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "title": "A short descriptive title for these notes",
  "blocks": [
    { "type": "summary", "content": "2-3 sentence overview of the key takeaways" },
    { "type": "warning", "content": "Any urgent/critical/important points" },
    { "type": "heading", "content": "Topic heading" },
    { "type": "bullet", "content": "A key point extracted from the text" },
    { "type": "task", "content": "An action item detected in the text" },
    { "type": "tag-group", "content": "keyword1, keyword2, keyword3" }
  ],
  "tags": ["keyword1", "keyword2"]
}

Block types available: summary, warning, heading, bullet, paragraph, task, tag-group.
Rules:
- Extract IMPORTANT points only, don't just repeat the input verbatim
- Summarize and synthesize, don't copy sentences word-for-word
- Detect action items (tasks) from verbs like finalize, schedule, review, etc.
- Detect warnings from urgency words like urgent, critical, deadline, etc.
- Group related points under headings
- Generate relevant tags/keywords
- Keep bullet points concise (1-2 sentences max)
- Always start with a summary block
- Always end with a tag-group block`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: rawText },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the AI response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("format-notes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
