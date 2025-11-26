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
    const { assignmentText, level } = await req.json();

    if (!assignmentText || !level) {
      return new Response(
        JSON.stringify({ error: 'Opdrachttekst en niveau zijn verplicht' }),
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
        JSON.stringify({ error: 'AI-configuratie niet gevonden. Configureer eerst de AI-instellingen.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenRouter API
    const prompt = `Je bent een expert in taaldidactiek en het maken van opdracht-checklists voor het Nederlandse onderwijs.

Analyseer de volgende schrijfopdracht voor niveau ${level} en maak een checklist met minimumeisen voor de leerlingtekst.

Opdracht:
${assignmentText}

Geef de checklist terug in dit exacte JSON-formaat:
{
  "checklist": [
    {
      "label": "Korte, concrete eis (bijv. 'De tekst heeft een titel')",
      "description": "Optionele toelichting waarom dit belangrijk is"
    }
  ]
}

Let op:
- Maak 4-6 concrete, toetsbare minimumeisen die direct uit de opdracht volgen
- Denk aan: structuur (titel, inleiding, middenstuk, slot), minimale lengte, standpunt, argumenten, specifieke elementen die de opdracht vraagt
- Formuleer elke eis als een concrete check die je met Ja/Nee kunt beantwoorden
- Maak ze specifiek voor deze opdracht, niet algemeen
- Houd rekening met het niveau ${level}`;

    console.log('Calling OpenRouter API with model:', config.model);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://punt-app.lovable.app',
        'X-Title': 'PUNT! Schrijfomgeving'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Fout bij AI-analyse', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenRouter response:', data);
    
    const aiResponse = data.choices[0].message.content;
    const parsedResponse = JSON.parse(aiResponse);

    // Return the checklist (keep "checklist" as key for clarity)
    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ai-suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
