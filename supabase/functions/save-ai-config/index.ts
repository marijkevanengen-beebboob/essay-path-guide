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
    const { apiKey, model } = await req.json();

    if (!apiKey || !model) {
      return new Response(
        JSON.stringify({ success: false, message: 'API key en model zijn verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store configuration in Supabase KV or table
    // For simplicity, we'll store in a simple config table
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if config table exists, if not create it
    const { error: tableError } = await supabase
      .from('ai_config')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc('create_ai_config_table');
      if (createError) {
        console.error('Error creating table:', createError);
      }
    }

    // Store or update the config (use a single row with id=1)
    const { error: upsertError } = await supabase
      .from('ai_config')
      .upsert({
        id: 1,
        api_key: apiKey,
        model: model,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('Error storing config:', upsertError);
      return new Response(
        JSON.stringify({ success: false, message: 'Fout bij opslaan van configuratie' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'AI-configuratie succesvol opgeslagen' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-ai-config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
