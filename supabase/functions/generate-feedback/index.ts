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

    // Split text into sentences for better accuracy
    const sentences: Array<{text: string, start: number, end: number}> = [];
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    let match;
    let currentIndex = 0;
    
    while ((match = sentenceRegex.exec(text)) !== null) {
      sentences.push({
        text: match[0].trim(),
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // If no sentences found (e.g., text without punctuation), treat whole text as one sentence
    if (sentences.length === 0) {
      sentences.push({ text: text.trim(), start: 0, end: text.length });
    }

    // Build numbered sentence list for AI
    const numberedSentences = sentences.map((s, i) => `ZIN ${i}: ${s.text}`).join('\n');

    // Build the system prompt
    const systemPrompt = `Je bent een ervaren docent Nederlands in het voortgezet onderwijs.
Je beoordeelt leerlingteksten op basis van expliciete beoordelingscriteria (zoals structuur, argumentatie, formulering, spelling).
Je geeft concrete, bondige feedback in het Nederlands, gericht op verbetering.
Je baseert je feedback uitsluitend op de aangeleverde tekst, opdracht en beoordelingscriteria.

WERKWIJZE:
1. Lees EERST de volledige leerlingtekst zorgvuldig door
2. Analyseer de tekst op basis van ALLEEN de meegegeven beoordelingscriteria
3. Kies maximaal 5 concrete verbeterpunten die het belangrijkst zijn
4. Koppel elk verbeterpunt expliciet aan precies één criterium uit de lijst
5. Verwijs naar zinnen via hun zinsnummer (ZIN 0, ZIN 1, etc.)

BELANGRIJK:
- Gebruik ALLEEN de beoordelingscriteria uit de aangeleverde lijst
- Geef geen feedback over aspecten die niet in de criteria staan
- Wees constructief en bemoedigend
- Geef praktische, concrete verbetervoorstellen
- Bepaal het juiste type: "spelling", "grammar", "structure" of "content"
- Antwoord ALLEEN in puur JSON zonder extra tekst

Je antwoord MOET een JSON object zijn met deze EXACTE structuur:
{
  "feedback": [
    {
      "sentenceIndex": 0,
      "type": "content",
      "criterionLabel": "Naam van het criterium uit de lijst",
      "hint": "Korte, heldere uitleg wat de leerling kan verbeteren"
    }
  ]
}`;

    const userPrompt = `OPDRACHT:
${assignmentText || "Geen specifieke opdracht gegeven"}

REFERENTIENIVEAU: ${level}

BEOORDELINGSCRITERIA (gebruik ALLEEN deze criteria):
${criteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

LEERLINGTEKST (genummerde zinnen):
${numberedSentences}

Analyseer de volledige tekst op basis van de beoordelingscriteria en geef maximaal 5 concrete verbeterpunten.
Return alleen het JSON object met de feedback array (geen extra tekst).`;

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

    // Map sentence indices to character ranges and format feedback
    const formattedFeedback = feedbackArray
      .filter((item: any) => 
        typeof item.sentenceIndex === 'number' && 
        item.sentenceIndex >= 0 && 
        item.sentenceIndex < sentences.length &&
        item.criterionLabel &&
        item.hint
      )
      .map((item: any, index: number) => {
        const sentence = sentences[item.sentenceIndex];
        return {
          id: String(index + 1),
          range: {
            start: sentence.start,
            end: sentence.end
          },
          color: index % 2 === 0 ? "bg-yellow-200" : "bg-blue-200",
          type: item.type || "content",
          criterionLabel: item.criterionLabel,
          hint: item.hint
        };
      });

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
