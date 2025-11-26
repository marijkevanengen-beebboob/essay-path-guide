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
Je beoordeelt leerlingteksten op basis van:
1. De exacte opdrachtformulering van de docent (primaire lens)
2. De expliciete beoordelingscriteria die zijn meegegeven

Je denkt eerst heel precies na over wat de opdracht van de docent vraagt, en gebruikt dat als belangrijkste referentiepunt.
Daarna leg je de uitvoering van de opdracht naast de beoordelingscriteria.
Je schrijft in helder, bondig Nederlands.
Je geeft alleen feedbackpunten die aanleiding geven tot concrete verbetering (iets dat de leerling anders kan doen in de tekst).

DENKSTAPPEN (beschreven voor interne analyse, output blijft JSON):

1. ANALYSEER DE OPDRACHT VAN DE DOCENT:
   - Wat is het doel van de opdracht? (betoog, beschouwing, samenvatting, brief, column, etc.)
   - Voor wie lijkt de tekst bedoeld? (doelgroep)
   - Welke expliciete eisen lees je in de opdracht? (standpunt innemen, aantal argumenten, brongebruik, voor-/nadelen, etc.)
   - Vat de opdracht kort samen in eigen woorden (intern)

2. ANALYSEER DE STRUCTUUR VAN DE LEERLINGTEKST:
   - Neem aan dat de EERSTE REGEL de titel is (als die daar logisch staat)
   - De INLEIDING begint in de eerste alinea NÁ de titel
   - Splits de tekst in alinea's (op lege regels)
   - Bepaal: welke alinea is inleiding, welke horen bij middenstuk, welke bij slot?
   - BELANGRIJK: Gebruik de titel alleen als titel, NIET als bewijs dat de leerling "het onderwerp in de inleiding noemt"

3. LEG DE LEERLINGTEKST NAAST DE OPDRACHT:
   - In hoeverre voert de tekst de opdracht uit?
   - Waar wijkt de tekst het meest af van wat de opdracht vraagt?

4. LEG DE TEKST LANGS DE BEOORDELINGSCRITERIA:
   - Kijk per criterium: waar wijkt de tekst het duidelijkst af?

5. KIES MAXIMAAL 5 BELANGRIJKSTE VERBETERPUNTEN:
   - Kies alleen punten waar de leerling echt iets aan kan veranderen
   - Combineer opdracht + criterium in je beoordeling
   - Geef geen pure complimenten; koppel positieve punten aan verdere verbetering
   - Elke hint moet een concrete actie bevatten (voeg toe, schrap, herformuleer, verplaats, etc.)

BELANGRIJK:
- Verwijs naar zinnen via hun zinsnummer (ZIN 0, ZIN 1, etc.)
- Elk feedbackpunt verwijst impliciet of expliciet naar de docentopdracht
- Elk feedbackpunt is gekoppeld aan één beoordelingscriterium
- Type moet "spelling", "grammar", "structure" of "content" zijn
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

    const userPrompt = `OPDRACHT VAN DE DOCENT:
${assignmentText || "Geen specifieke opdracht gegeven"}

REFERENTIENIVEAU: ${level}

BEOORDELINGSCRITERIA (gebruik ALLEEN deze criteria):
${criteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

LEERLINGTEKST (genummerde zinnen):
${numberedSentences}

INSTRUCTIE:
Volg de denkstappen uit je system prompt:
1. Analyseer eerst de opdracht van de docent (doel, doelgroep, expliciete eisen)
2. Analyseer de structuur van de leerlingtekst (titel = eerste regel, inleiding begint daarna, alinea's splitsen)
3. Leg de leerlingtekst naast de opdracht (in hoeverre wordt de opdracht uitgevoerd?)
4. Leg de tekst langs de beoordelingscriteria (waar wijkt de tekst af?)
5. Kies maximaal 5 belangrijkste verbeterpunten die:
   - Verwijzen naar de opdracht EN een criterium
   - Een concrete actie bevatten (voeg toe, herformuleer, verplaats, schrap, etc.)
   - Geen pure complimenten zijn

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
