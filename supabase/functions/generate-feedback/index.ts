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

    // Separate checklist criteria from other criteria
    const checklistCriteria = criteria.filter((c: any) => c.origin === "assignment");
    const otherCriteria = criteria.filter((c: any) => c.origin !== "assignment");

    // Build the system prompt based on round
    const systemPrompt = round === 1 
      ? `Je bent een ervaren docent Nederlands in het voortgezet onderwijs.

RONDE 1: OPDRACHT-CHECKLIST + INHOUDELIJKE FEEDBACK

In de eerste feedbackronde geef je TWEE soorten feedback:

A) OPDRACHT-CHECKLIST BEOORDELING:
Je krijgt een lijst "Opdracht-checklist" met minimumeisen uit de opdracht.
Voor elk item bepaal je: is dit in de huidige tekst aanwezig (MET) of niet (NIET MET)?
Geef per item een korte, concrete uitleg (max 1 zin) waarom wel/niet.

B) INHOUDELIJKE VERBETERPUNTEN (max 5):
Op basis van de overige beoordelingscriteria geef je maximaal 5 concrete verbeterpunten.
Deze zijn gekoppeld aan tekstfragmenten (zinsnummers) en criteria.

DENKSTAPPEN:
1. ANALYSEER DE OPDRACHT VAN DE DOCENT:
   - Wat is het doel? (betoog, beschouwing, brief, etc.)
   - Voor wie? (doelgroep)
   - Welke expliciete eisen? (standpunt, argumenten, bronnen, etc.)

2. ANALYSEER DE STRUCTUUR VAN DE LEERLINGTEKST:
   - Eerste regel = titel (indien aanwezig)
   - Inleiding begint in eerste alinea na titel
   - Splits in alinea's
   - Bepaal: inleiding, middenstuk, slot

3. BEOORDEEL OPDRACHT-CHECKLIST:
   - Loop elk checklist-item af
   - Is dit aanwezig in de tekst? Ja/Nee
   - Korte uitleg (1 zin)

4. KIES MAXIMAAL 5 BELANGRIJKSTE VERBETERPUNTEN:
   - Alleen punten waar leerling iets aan kan veranderen
   - Concrete acties (voeg toe, herformuleer, verplaats, etc.)
   - Geen pure complimenten
   - Verwijs naar zinsnummers (ZIN 0, ZIN 1, etc.)

Je antwoord MOET deze EXACTE JSON-structuur hebben:
{
  "checklistResults": [
    {
      "id": "chk_id",
      "label": "Label van checklist-item",
      "met": true,
      "explanation": "Korte uitleg waarom dit wel/niet is voldaan"
    }
  ],
  "feedbackItems": [
    {
      "sentenceIndex": 0,
      "type": "content",
      "criterionLabel": "Naam criterium uit lijst",
      "hint": "Concrete verbetertip"
    }
  ]
}`
      : `Je bent een ervaren docent Nederlands in het voortgezet onderwijs.

RONDE ${round}: OPDRACHT-CHECKLIST + NIEUWE INHOUDELIJKE FEEDBACK

Dit is feedbackronde ${round} van 3. De leerling heeft eerder al feedback ontvangen en mogelijk zijn tekst aangepast.

In deze feedbackronde geef je TWEE soorten feedback:

A) OPDRACHT-CHECKLIST BEOORDELING (OPNIEUW):
Je krijgt een lijst "Opdracht-checklist" met minimumeisen uit de opdracht.
Voor elk item bepaal je OPNIEUW: is dit in de HUIDIGE tekst aanwezig (MET) of niet (NIET MET)?
Geef per item een korte, concrete uitleg (max 1 zin) waarom wel/niet.
Dit is belangrijk omdat de leerling mogelijk dingen heeft toegevoegd of aangepast.

B) NIEUWE INHOUDELIJKE VERBETERPUNTEN (max 5):
KRITISCHE REGEL: Geef ALLEEN feedback op punten die je NIET eerder hebt benoemd.
- Herhaal GEEN feedback op dezelfde zin/hetzelfde criterium als in eerdere rondes
- Kies nieuwe, andere verbeterpunten
- Als er weinig nieuwe punten zijn: geef minder dan 5 items (of zelfs 0)

DENKSTAPPEN:
1. ANALYSEER DE OPDRACHT VAN DE DOCENT:
   - Wat is het doel en wat vraagt de opdracht?

2. ANALYSEER DE STRUCTUUR VAN DE LEERLINGTEKST:
   - Eerste regel = titel
   - Inleiding, middenstuk, slot

3. BEOORDEEL OPDRACHT-CHECKLIST OPNIEUW:
   - Loop elk checklist-item af
   - Is dit aanwezig in de HUIDIGE tekst? Ja/Nee
   - Korte uitleg (1 zin)

4. VERGELIJK MET EERDERE FEEDBACK:
   - Welke zinnen/criteria zijn AL behandeld?
   - Welke verbeterpunten zijn NOG NIET benoemd?

5. KIES MAXIMAAL 5 NIEUWE VERBETERPUNTEN:
   - Alleen punten die NIET in eerdere rondes zijn gegeven
   - Concrete acties
   - Als er weinig nieuwe punten zijn: geef minder items

Je antwoord MOET deze EXACTE JSON-structuur hebben:
{
  "checklistResults": [
    {
      "id": "chk_id",
      "label": "Label van checklist-item",
      "met": true,
      "explanation": "Korte uitleg waarom dit wel/niet is voldaan"
    }
  ],
  "feedbackItems": [
    {
      "sentenceIndex": 0,
      "type": "content",
      "criterionLabel": "Naam criterium",
      "hint": "Concrete verbetertip"
    }
  ]
}

BELANGRIJK: Als er nauwelijks nieuwe verbeterpunten zijn, retourneer een lege array [] voor feedbackItems, maar retourneer ALTIJD checklistResults.`;

    const userPrompt = `OPDRACHT VAN DE DOCENT:
${assignmentText || "Geen specifieke opdracht gegeven"}

REFERENTIENIVEAU: ${level}

OPDRACHT-CHECKLIST (beoordeel per item: aanwezig/niet aanwezig in HUIDIGE tekst):
${checklistCriteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

OVERIGE BEOORDELINGSCRITERIA (voor inhoudelijke feedback):
${otherCriteria.map((c: any, i: number) => `${i + 1}. ${c.label}: ${c.description || ''}`).join('\n')}

LEERLINGTEKST (genummerde zinnen):
${numberedSentences}

${round > 1 ? `EERDERE FEEDBACK (NIET HERHALEN):
${previousFeedback.length > 0 
  ? previousFeedback.map((f: any) => `- ZIN ${f.sentenceIndex}: "${f.criterionLabel}" - ${f.hint}`).join('\n')
  : 'Geen eerdere feedback'}
` : ''}

INSTRUCTIE RONDE ${round}:
1. Beoordeel EERST alle Opdracht-checklist items: is elk item aanwezig in de HUIDIGE tekst (met: true) of niet (met: false)?
2. Geef per checklist-item een korte uitleg (max 1 zin)
3. Kies daarna MAXIMAAL 5 ${round > 1 ? 'NIEUWE ' : ''}inhoudelijke verbeterpunten op basis van de overige criteria
${round > 1 ? '4. Vermijd herhaling van eerdere feedback op dezelfde zinnen/criteria\n5. Als er weinig nieuwe punten zijn: geef minder dan 5 items' : '4. Elk verbeterpunt: verwijst naar een zinsnummer en heeft een concrete actie'}

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

    let parsedResponse;
    try {
      const content = data.choices[0].message.content;
      console.log("AI response content:", content);
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(
        JSON.stringify({ error: 'Fout bij verwerken van AI-antwoord' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All rounds now return both checklist and feedback items
    const checklistResults = parsedResponse.checklistResults || [];
    const feedbackArray = parsedResponse.feedbackItems || [];

    // Format feedback items
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
          range: { start: sentence.start, end: sentence.end },
          color: index % 2 === 0 ? "bg-yellow-200" : "bg-blue-200",
          type: item.type || "content",
          criterionLabel: item.criterionLabel,
          hint: item.hint,
          sentenceIndex: item.sentenceIndex
        };
      });

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
