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

    // Provide text with character positions for AI analysis
    const textWithLength = `LEERLINGTEKST (totaal ${text.length} karakters):\n${text}`;

    // Separate checklist criteria from other criteria
    const checklistCriteria = criteria.filter((c: any) => c.origin === "assignment");
    const otherCriteria = criteria.filter((c: any) => c.origin !== "assignment");

    // Build the system prompt based on round
    const systemPrompt = round === 1 
      ? `Je bent een ervaren docent Nederlands in het voortgezet onderwijs.

RONDE 1: OPDRACHT-CHECKLIST + INHOUDELIJKE FEEDBACK

KRITISCHE REGELS VOOR OUTPUT:
❌ Kopieer NOOIT tekst van de leerling (behalve max 2-3 losse woorden ter verwijzing)
❌ Herschrijf NOOIT zinnen van de leerling
❌ Dupliceer NOOIT zinnen of genereer geen nieuwe tekst alsof het van de leerling is
✅ Analyseer alleen en geef instructies zonder voorbeeldtekst

In de eerste feedbackronde geef je TWEE soorten feedback:

A) OPDRACHT-CHECKLIST BEOORDELING:
Je krijgt een lijst "Opdracht-checklist" met minimumeisen uit de opdracht.
Voor elk item bepaal je: is dit in de huidige tekst aanwezig (MET) of niet (NIET MET)?
Geef per item een korte, concrete uitleg (max 1 zin) waarom wel/niet.

B) INHOUDELIJKE VERBETERPUNTEN (max 5):
Op basis van de overige beoordelingscriteria geef je maximaal 5 concrete verbeterpunten.
Elk verbeterpunt:
- Verwijst naar een tekstfragment via CHARACTER POSITIONS (start/end index in de originele tekst)
- Heeft een type: "spelling", "grammar", "structure" of "content"
- Bevat een korte instructie WAT er mis is en WAT de leerling moet verbeteren
- Bevat GEEN herschreven tekst of voorbeeldzinnen

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
   - Bepaal START en END character position in de originele tekst
   - Kies het juiste type (spelling/grammar/structure/content)
   - Geef concrete instructie (bijv. "Maak je standpunt explicieter in de laatste zin van de inleiding")
   - GEEN herschreven zinnen, GEEN voorbeeldtekst

VERBODEN IN FEEDBACK:
- "Je zou kunnen schrijven: [voorbeeldzin]"
- "Probeer dit: [herschreven tekst]"
- "Bijvoorbeeld: [nieuwe zin]"
- Elke vorm van tekstgeneratie

TOEGESTAAN IN FEEDBACK:
- "Maak je standpunt explicieter in deze zin"
- "Voeg een tegenargument toe in deze alinea"
- "Herformuleer dit om duidelijker te zijn"
- "Controleer de spelling van dit woord"

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
      "range": { "start": 0, "end": 45 },
      "type": "spelling",
      "criterionLabel": "Naam criterium uit lijst",
      "hint": "Concrete instructie zonder herschreven tekst"
    }
  ]
}`
      : `Je bent een ervaren docent Nederlands in het voortgezet onderwijs.

RONDE ${round}: OPDRACHT-CHECKLIST + NIEUWE INHOUDELIJKE FEEDBACK

KRITISCHE REGELS VOOR OUTPUT:
❌ Kopieer NOOIT tekst van de leerling (behalve max 2-3 losse woorden ter verwijzing)
❌ Herschrijf NOOIT zinnen van de leerling
❌ Dupliceer NOOIT zinnen of genereer geen nieuwe tekst alsof het van de leerling is
✅ Analyseer alleen en geef instructies zonder voorbeeldtekst

Dit is feedbackronde ${round} van 3. De leerling heeft eerder al feedback ontvangen en mogelijk zijn tekst aangepast.

In deze feedbackronde geef je TWEE soorten feedback:

A) OPDRACHT-CHECKLIST BEOORDELING (OPNIEUW):
Je krijgt een lijst "Opdracht-checklist" met minimumeisen uit de opdracht.
Voor elk item bepaal je OPNIEUW: is dit in de HUIDIGE tekst aanwezig (MET) of niet (NIET MET)?
Geef per item een korte, concrete uitleg (max 1 zin) waarom wel/niet.
Dit is belangrijk omdat de leerling mogelijk dingen heeft toegevoegd of aangepast.

B) NIEUWE INHOUDELIJKE VERBETERPUNTEN (max 5):
KRITISCHE REGEL: Geef ALLEEN feedback op punten die je NIET eerder hebt benoemd.
- Herhaal GEEN feedback op hetzelfde tekstgedeelte/criterium als in eerdere rondes
- Kies nieuwe, andere verbeterpunten
- Als er weinig nieuwe punten zijn: geef minder dan 5 items (of zelfs 0)
- Elk verbeterpunt heeft CHARACTER POSITIONS (start/end) en een type (spelling/grammar/structure/content)
- Geef ALLEEN instructies, GEEN herschreven tekst

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
   - Welke tekstgedeeltes/criteria zijn AL behandeld?
   - Welke verbeterpunten zijn NOG NIET benoemd?

5. KIES MAXIMAAL 5 NIEUWE VERBETERPUNTEN:
   - Alleen punten die NIET in eerdere rondes zijn gegeven
   - Bepaal START en END character position
   - Kies type: spelling, grammar, structure of content
   - Concrete instructie zonder voorbeeldtekst

VERBODEN IN FEEDBACK:
- "Je zou kunnen schrijven: [voorbeeldzin]"
- "Probeer dit: [herschreven tekst]"
- Elke vorm van tekstgeneratie

TOEGESTAAN IN FEEDBACK:
- "Maak je standpunt explicieter"
- "Voeg een tegenargument toe"
- "Herformuleer voor meer duidelijkheid"

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
      "range": { "start": 0, "end": 45 },
      "type": "content",
      "criterionLabel": "Naam criterium",
      "hint": "Concrete instructie zonder herschreven tekst"
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

${textWithLength}

${round > 1 ? `EERDERE FEEDBACK (NIET HERHALEN - dit zijn de character ranges die al behandeld zijn):
${previousFeedback.length > 0 
  ? previousFeedback.map((f: any) => `- Range ${f.range.start}-${f.range.end}: "${f.criterionLabel}"`).join('\n')
  : 'Geen eerdere feedback'}
` : ''}

INSTRUCTIE RONDE ${round}:
1. Beoordeel EERST alle Opdracht-checklist items: is elk item aanwezig in de HUIDIGE tekst (met: true) of niet (met: false)?
2. Geef per checklist-item een korte uitleg (max 1 zin)
3. Kies daarna MAXIMAAL 5 ${round > 1 ? 'NIEUWE ' : ''}inhoudelijke verbeterpunten op basis van de overige criteria
4. Elk verbeterpunt MOET:
   - range hebben met START en END character position (0-based index in de tekst)
   - type hebben: "spelling", "grammar", "structure" of "content"
   - criterionLabel hebben uit de bovenstaande criteria
   - hint hebben met alleen INSTRUCTIE (geen voorbeeldtekst, geen herschreven zinnen)
${round > 1 ? '5. Vermijd herhaling: kies andere character ranges dan hierboven genoemd\n6. Als er weinig nieuwe punten zijn: geef minder dan 5 items' : ''}

ONTHOUD: Analyseer alleen, herschrijf nooit. Geef instructies, geen voorbeelden.

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

    // Map type to color
    const typeToColor: { [key: string]: string } = {
      spelling: "bg-red-200",
      grammar: "bg-orange-200",
      structure: "bg-blue-200",
      content: "bg-yellow-200"
    };

    // Format feedback items - AI now provides ranges directly
    const formattedFeedback = feedbackArray
      .filter((item: any) => 
        item.range &&
        typeof item.range.start === 'number' && 
        typeof item.range.end === 'number' &&
        item.range.start >= 0 && 
        item.range.end <= text.length &&
        item.range.start < item.range.end &&
        item.criterionLabel &&
        item.hint &&
        item.type
      )
      .map((item: any, index: number) => {
        return {
          id: String(index + 1),
          range: { start: item.range.start, end: item.range.end },
          color: typeToColor[item.type] || "bg-gray-200",
          type: item.type,
          criterionLabel: item.criterionLabel,
          hint: item.hint
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
