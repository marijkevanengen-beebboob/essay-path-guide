import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Get AI config from database (same as generate-ai-suggestions)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: config, error: configError } = await supabase
      .from('ai_config')
      .select('api_key, model')
      .eq('id', 1)
      .single();

    if (configError || !config) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ error: 'AI-configuratie niet gevonden. Vraag je docent om de AI-instellingen te configureren.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the system prompt
    const systemPrompt = `Je bent een AI-assistent die Nederlandse leerlingen helpt hun schrijfvaardigheid te verbeteren op niveau ${level}.

Je krijgt een opdracht, een leerlingtekst en specifieke beoordelingscriteria.

Je taak:
1. Analyseer de tekst op basis van de gegeven criteria
2. Vind 2-5 specifieke tekstsegmenten die aandacht nodig hebben
3. Voor elk segment, geef het start- en eindkarakter positie in de tekst (let op: tel vanaf 0)
4. Geef constructieve, beknopte feedback

BELANGRIJK:
- Geef feedback die SPECIFIEK is voor de geselecteerde tekst
- Wees constructief en bemoedigend
- Focus op de criteria die de docent heeft ingesteld
- Geef praktische verbetervoorstellen
- Bepaal het juiste type: "spelling", "grammar", "structure" of "content"

Je antwoord MOET een JSON object zijn met deze EXACTE structuur:
{
  "feedback": [
    {
      "range": { "start": 14, "end": 47 },
      "type": "content",
      "criterionLabel": "Criterium naam",
      "hint": "Feedback tekst hier"
    }
  ]
}`;

    const userPrompt = `OPDRACHT:
${assignmentText || "Geen specifieke opdracht gegeven"}

LEERLINGTEKST:
${text}

BEOORDELINGSCRITERIA:
${criteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

Analyseer de tekst en geef 2-5 stukken feedback. Return alleen het JSON object met de feedback array.`;

    console.log('Calling OpenRouter API with model:', config.model);

    // Call OpenRouter API with the configured model
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://punt-app.lovable.app",
        "X-Title": "PUNT! Schrijfomgeving"
      },
      body: JSON.stringify({
        model: config.model,
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
      console.log("AI response content:", content);
      const parsed = JSON.parse(content);
      feedbackArray = parsed.feedback || (Array.isArray(parsed) ? parsed : []);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(
        JSON.stringify({ error: 'Fout bij verwerken van AI-antwoord' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(feedbackArray) || feedbackArray.length === 0) {
      console.log("No feedback items generated");
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
