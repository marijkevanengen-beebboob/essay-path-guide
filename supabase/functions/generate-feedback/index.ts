import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, assignmentText, level, criteria } = await req.json();

    // Input validation
    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Tekst is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(criteria) || criteria.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Criteria zijn verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment (server-side only)
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'AI-feedback is nog niet geconfigureerd. Vraag je docent om dit in te stellen.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the system prompt
    const systemPrompt = `Je bent een AI-assistent die Nederlandse leerlingen helpt hun schrijfvaardigheid te verbeteren op niveau ${level}.

Je krijgt een opdracht, een leerlingtekst en specifieke beoordelingscriteria.

Je taak:
1. Analyseer de tekst op basis van de gegeven criteria
2. Vind 2-5 specifieke tekstsegmenten die aandacht nodig hebben
3. Voor elk segment, geef het start- en eindkarakter positie in de tekst
4. Geef constructieve, beknopte feedback

BELANGRIJK:
- Geef feedback die SPECIFIEK is voor de geselecteerde tekst
- Wees constructief en bemoedigend
- Focus op de criteria die de docent heeft ingesteld
- Geef praktische verbetervoorstellen

Je antwoord MOET een JSON array zijn met deze structuur:
[
  {
    "range": { "start": 14, "end": 47 },
    "type": "content",
    "criterionLabel": "Criterium naam",
    "hint": "Feedback tekst hier"
  }
]`;

    const userPrompt = `OPDRACHT:
${assignmentText || "Geen specifieke opdracht gegeven"}

LEERLINGTEKST:
${text}

BEOORDELINGSCRITERIA:
${criteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

Analyseer de tekst en geef 2-5 stukken feedback. Return alleen de JSON array, geen andere tekst.`;

    console.log("Calling OpenRouter API...");

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI-service niet beschikbaar. Probeer het later opnieuw.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("OpenRouter response received");

    let feedbackArray;
    try {
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      feedbackArray = Array.isArray(parsed) ? parsed : (parsed.feedback || []);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(
        JSON.stringify({ error: 'Fout bij verwerken van AI-antwoord' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and format feedback
    const formattedFeedback = feedbackArray
      .filter((item: any) => item.range && typeof item.range.start === 'number' && typeof item.range.end === 'number')
      .map((item: any, index: number) => ({
        id: String(index + 1),
        range: {
          start: Math.max(0, Math.min(item.range.start, text.length)),
          end: Math.max(0, Math.min(item.range.end, text.length))
        },
        color: index % 2 === 0 ? "bg-yellow-200" : "bg-blue-200",
        type: item.type || "content",
        hint: item.hint || item.feedback || "Algemene feedback"
      }));

    console.log(`Generated ${formattedFeedback.length} feedback items`);

    return new Response(
      JSON.stringify(formattedFeedback),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-feedback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
