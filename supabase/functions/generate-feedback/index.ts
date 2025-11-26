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

    // Build the system prompt for new feedback structure
    const systemPrompt = `Je bent een schrijfcoach voor leerlingen in het Nederlandse taalonderwijs.
Je krijgt een leerlingtekst, de opdracht van de docent, en criteria waar de tekst aan getoetst moet worden.

BELANGRIJKE REGELS:
1. Je analyseert de tekst ZONDER deze te herschrijven
2. Je kopieert NOOIT fragmenten uit de leerlingtekst
3. Je geeft alleen verwijzingen naar locaties (bijv. "Alinea 2", "Titel", "Slot")
4. Je identificeert maximaal 5 kernpunten per feedbackronde
5. Je feedback is kritisch en concreet - geen complimenten, geen samenvatting
6. Je noemt alleen problemen en geeft advies voor verbetering

CONTEXT:
- Niveau: ${level}
- Feedbackronde: ${round}/3
- Criteria: ${JSON.stringify(criteria.map((c: any) => ({ label: c.label, description: c.description })))}

${round > 1 ? `EERDERE FEEDBACK (vermijd herhaling):\n${JSON.stringify(previousFeedback)}` : ''}

OPDRACHT VAN DE DOCENT (PRIORITEIT):
${assignmentText}

WERKWIJZE:
1. Lees de volledige leerlingtekst
2. Analyseer wat de opdracht van de docent vraagt
3. Controleer welke criteria aangezet zijn
4. Bepaal wat ontbreekt of fout gaat
5. Genereer eerst een checklist op basis van de opdracht
6. Geef maximaal 5 feedbackpunten

OUTPUT FORMAAT:
Geef je analyse terug als JSON met deze structuur:
{
  "checklistResults": [
    {"id": "check-1", "label": "Korte omschrijving wat gecheckt wordt", "met": true/false, "explanation": "Waarom wel/niet voldaan"}
  ],
  "feedbackItems": [
    {
      "location": "Titel | Alinea 1 | Alinea 2 - zin 3 | Slot",
      "problem": "Duidelijke, kritische beschrijving van het probleem",
      "advice": "Wat de leerling moet aanpassen (toevoegen/schrappen/herformuleren/verplaatsen)"
    }
  ]
}

CHECKLIST:
- Genereer 3-5 checklistitems op basis van de opdracht van de docent
- Items zijn concreet controleerbaar (bijv. "Titel aanwezig", "Minstens 3 alinea's", "Inleiding bevat standpunt")
- Elke check heeft een duidelijke label en explanation

FEEDBACKPUNTEN:
- Maximaal 5 punten
- Elk punt heeft location, problem, advice
- Location is logisch (Titel/Alinea X/Slot)
- Problem is kritisch en specifiek
- Advice is concreet en actionable
- GEEN tekstfragmenten kopiëren
- GEEN complimenten
- Focus op wat ONTBREEKT of FOUT is

Wees streng, concreet en kritisch. De leerling wil echte verbeterpunten.`;

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
1. Genereer EERST een checklist (3-5 items) op basis van wat de opdracht van de docent vraagt
2. Beoordeel elk checklist-item: aanwezig (met: true) of niet (met: false)?
3. Geef daarna MAXIMAAL 5 ${round > 1 ? 'NIEUWE ' : ''}inhoudelijke verbeterpunten
4. Elk feedbackpunt MOET hebben:
   - location: logische verwijzing (bijv. "Titel", "Alinea 1", "Alinea 2 - zin 3", "Slot")
   - problem: kritische beschrijving van wat er mis is
   - advice: concrete instructie wat de leerling moet doen
5. GEEN tekstfragmenten kopiëren, GEEN complimenten, ALLEEN problemen

Return het JSON object met checklistResults én feedbackItems.`;

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
      met: item.met === true,
      explanation: item.explanation || ''
    }));

    // Format feedback items (no ranges, simple structure)
    const formattedFeedback = (aiResponse.feedbackItems || [])
      .slice(0, 5) // Enforce max 5 items
      .map((item: any, index: number) => ({
        id: `feedback-${index}-${Date.now()}`,
        location: item.location || 'Onbekende locatie',
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
