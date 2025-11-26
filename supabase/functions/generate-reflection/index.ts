import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { 
      firstFeedbackVersion, 
      finalText, 
      feedbackHistory, 
      lastChecklist,
      assignmentText,
      criteria,
      level
    } = await req.json();

    console.log('Generating reflection report...');

    // Get OpenRouter API key from environment
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    // Prepare feedback summary for AI
    const feedbackSummary = feedbackHistory.map((round: any, idx: number) => {
      return `\n=== Feedbackronde ${idx + 1} ===\n` +
        round.feedback.map((item: any) => 
          `- Locatie: ${item.location}\n  Probleem: ${item.problem}\n  Advies: ${item.advice}\n  Status: ${item.status || 'onbekend'}`
        ).join('\n');
    }).join('\n');

    const checklistSummary = lastChecklist && lastChecklist.length > 0
      ? lastChecklist.map((item: any) => `${item.passed ? '✔️' : '❌'} ${item.label}`).join('\n')
      : 'Geen checklist beschikbaar';

    const systemPrompt = `Je bent een beoordelaar voor PUNT!, een schrijfplatform voor taalonderwijs. Je taak is om een feedbackrapport te schrijven voor de docent.

Het rapport moet ZAKELIJK, CONCREET en INFORMATIEF zijn. Geen vage complimenten.

Het rapport moet analyseren:
1. Hoe de leerling met feedback is omgegaan (welke verwerkt, welke niet)
2. Concrete verbeteringen tussen Versie 1 en Eindversie
3. In hoeverre de tekst nu voldoet aan docent-eisen (checklist)
4. Welke feedback niet is opgevolgd

STRUCTUUR (gebruik deze koppen):

**Samenvatting**
2-4 zinnen over de algehele verbetering van Versie 1 naar Eindversie.

**Gebruik van feedback**
- Benoem 2-5 concrete voorbeelden waar feedback WEL is verwerkt
- Benoem welke feedback NIET of nauwelijks is verwerkt
- Wees specifiek: verwijs naar locaties (bijv. "in de inleiding", "in alinea 2")

**Checklist – docent-eisen**
Geef per eis aan of deze is behaald en leg kort uit waarom wel/niet:
${checklistSummary}

**Niet-opgevolgde feedback**
Zakelijke opsomming van feedback die gegeven maar niet verwerkt is.

STIJL-EISEN:
- Schrijf in zakelijk Nederlands voor de docent
- Geen complimenten zoals "goed bezig!"
- Focus op concrete observaties en ontwikkelpunten
- Kopieer NOOIT letterlijk tekst van de leerling (max 2-3 woorden als referentie)
- Wees specifiek en concreet, niet vaag`;

    const userPrompt = `Niveau: ${level}

Opdracht van de docent:
${assignmentText}

Criteria die de docent heeft ingesteld:
${criteria.map((c: any) => `- ${c.label}: ${c.description || ''}`).join('\n')}

Versie 1 (bij eerste feedback):
${firstFeedbackVersion || 'Niet beschikbaar'}

Eindversie:
${finalText}

Alle feedbackrondes:
${feedbackSummary}

Laatste checklist:
${checklistSummary}

Genereer nu een feedbackrapport volgens de structuur hierboven.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices[0].message.content;

    console.log('Reflection report generated successfully');

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-reflection:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        report: 'Er is een fout opgetreden bij het genereren van het feedbackrapport. De docent kan de ontwikkeling beoordelen op basis van Versie 1 en de Eindversie.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});