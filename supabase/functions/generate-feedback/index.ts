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
    const { text, assignmentText, level, criteria, round = 1, previousFeedback = [] } = await req.json();

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

    // Get AI config from database
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

    // Build the system prompt for new feedback structure with MACRO-MESO-MICRO analysis
    const systemPrompt = `Je bent een feedbacksysteem voor PUNT!, een schrijfplatform voor taalonderwijs (niveau ${level}).

Je taak is om leerlingteksten te beoordelen volgens de door de docent ingestelde criteria.

ANALYSESTRUCTUUR (VERPLICHT IN DEZE VOLGORDE):

1. MACRO-ANALYSE (altijd eerst):
   - Bepaal tekstfunctie (beschouwen/betogen/informeren/etc.)
   - Tel aantal alinea's
   - Controleer globale structuur: titel, inleiding, middenstuk, slot
   - Beoordeel logische opbouw van de tekst als geheel

2. MESO-ANALYSE (inhoud & argumentatie):
   - Vergelijk tekst met opdracht: welke inhoudelijke eisen worden gehaald?
   - Analyseer argumentatie, relevantie, voorbeelden, consistentie
   - Relatie met onderwerp en niveau ${level}

3. MICRO-ANALYSE (taalniveau):
   - Woordkeuze, zinsbouw, spelling, interpunctie
   - Alleen als grotere macro/meso problemen afwezig zijn

NIVEAUPROFIELEN:
- 1F: begrijpelijkheid, eenvoudige zinnen, minimale structuur
- 2F: duidelijke opbouw, eenvoudige logica, basisargumentatie
- 3F: consistente redenering, passende structuur, helder register
- 4F: nuance, diepgang, retoriek, publieksgericht schrijven, professionele stijl

FEEDBACKREGELS:
1. Maximaal 5 concrete verbeterpunten (prioriteit: macro → meso → micro)
2. GEEN complimenten - alleen verbeteringen
3. Wees concreet en toepasbaar, nooit vaag
4. Bij elk feedbackpunt: citeer het exacte woord of de zinsnede waar het over gaat
5. Vermeld altijd de locatie (bijv. "in alinea 2", "in de titel")
6. Kopieer max 1-2 zinnen als citaat, niet meer

CONTEXT:
- Niveau: ${level}
- Feedbackronde: ${round}/3
- Criteria: ${JSON.stringify(criteria.map((c: any) => ({ label: c.label, description: c.description })))}

${round > 1 ? `EERDERE FEEDBACK (vermijd herhaling):\n${JSON.stringify(previousFeedback)}` : ''}

OUTPUT FORMAAT (JSON):
{
  "checklistResults": [
    {"label": "korte eis", "description": "uitleg waarom dit belangrijk is", "passed": true/false}
  ],
  "feedbackItems": [
    {
      "location": "Titel / Inleiding / Alinea X / Slot",
      "quote": "exacte tekst uit de leerlingtekst (max 1-2 zinnen)",
      "problem": "wat is er niet goed",
      "advice": "wat moet de leerling veranderen"
    }
  ]
}

Wees streng, concreet en kritisch volgens de macro-meso-micro volgorde. De leerling wil echte verbeterpunten.`;

    const userPrompt = `OPDRACHT VAN DE DOCENT:
${assignmentText || "Geen specifieke opdracht gegeven"}

REFERENTIENIVEAU: ${level}

BEOORDELINGSCRITERIA:
${criteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

LEERLINGTEKST:
${text}

${round > 1 ? `EERDERE FEEDBACK (geef ANDERE punten):
${previousFeedback.length > 0 
  ? previousFeedback.map((f: any, i: number) => `${i + 1}. ${f.location}: ${f.problem}`).join('\n')
  : 'Geen eerdere feedback'}
` : ''}

INSTRUCTIE RONDE ${round}:
Volg de MACRO-MESO-MICRO analysestructuur strikt:

1. MACRO: Genereer EERST een checklist (3-5 items) over structuur en globale opbouw
   - Beoordeel elk item: passed: true/false
   
2. MESO + MICRO: Geef daarna MAXIMAAL 5 ${round > 1 ? 'NIEUWE ' : ''}verbeterpunten (prioriteit macro → meso → micro)

3. Elk feedbackpunt MOET hebben:
   - location: "in de titel", "in alinea 1", "in het slot", etc.
   - quote: exacte woord of zinsnede uit de leerlingtekst (max 1-2 zinnen)
   - problem: wat is er niet goed
   - advice: concrete actie (toevoegen/schrappen/herformuleren/verplaatsen)

4. GEEN complimenten, ALLEEN concrete verbeteringen

Return het JSON object met checklistResults én feedbackItems met daarin location, quote, problem en advice.`;

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

    let aiResponse;
    try {
      const content = data.choices[0].message.content;
      console.log("AI response content:", content);
      aiResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(
        JSON.stringify({ error: 'Fout bij verwerken van AI-antwoord' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format checklist results
    const checklistResults = (aiResponse.checklistResults || []).map((item: any, index: number) => ({
      id: item.id || `check-${index}`,
      label: item.label || 'Onbekend criterium',
      met: item.passed === true || item.met === true,
      explanation: item.explanation || item.description || ''
    }));

    // Format feedback items with quotes
    const formattedFeedback = (aiResponse.feedbackItems || [])
      .slice(0, 5) // Enforce max 5 items
      .map((item: any, index: number) => ({
        id: `feedback-${index}-${Date.now()}`,
        location: item.location || 'Onbekende locatie',
        quote: item.quote || '',
        problem: item.problem || 'Geen probleem beschrijving',
        advice: item.advice || 'Geen advies beschikbaar'
      }));

    console.log(`Round ${round}: Generated ${checklistResults.length} checklist items and ${formattedFeedback.length} feedback items`);

    return new Response(
      JSON.stringify({
        checklistResults,
        feedbackItems: formattedFeedback
      }),
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
