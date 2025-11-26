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
    const { assignmentData, firstFeedbackVersion, hasRequestedFeedbackOnce, copyPasteTriggered, finalText, code } = await req.json();

    if (!finalText || !assignmentData) {
      return new Response(
        JSON.stringify({ error: 'Tekst en opdracht data zijn verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a simple HTML document that can be converted to PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #6366f1;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 10px;
    }
    h2 {
      color: #4f46e5;
      margin-top: 30px;
    }
    .metadata {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .text-block {
      background: #fff;
      border: 1px solid #e5e7eb;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      white-space: pre-wrap;
    }
    .badge {
      display: inline-block;
      background: #e0e7ff;
      color: #4f46e5;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      margin: 5px 5px 5px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <h1>PUNT! Schrijfomgeving - Opdracht</h1>
  
  <div class="metadata">
    <p><strong>Code:</strong> ${code}</p>
    <p><strong>Niveau:</strong> ${assignmentData.level}</p>
    <p><strong>Datum:</strong> ${new Date().toLocaleDateString('nl-NL')}</p>
  </div>

  <h2>Opdracht</h2>
  <div class="text-block">
${assignmentData.assignmentText}
  </div>

  <h2>Beoordelingscriteria</h2>
  <div>
${assignmentData.criteria.map((c: any) => `    <span class="badge">${c.label}</span>`).join('\n')}
  </div>

  ${hasRequestedFeedbackOnce && firstFeedbackVersion ? `
  <h2>Versie 1 (Eerste feedback moment)</h2>
  <div class="text-block">
${firstFeedbackVersion}
  </div>
  ` : ''}

  <h2>${hasRequestedFeedbackOnce ? 'Definitieve Versie' : 'Geschreven Tekst'}</h2>
  <div class="text-block">
${finalText}
  </div>

  ${!hasRequestedFeedbackOnce ? `
  <div class="metadata">
    <p><strong>Let op:</strong> Leerling heeft in deze sessie geen tussentijdse feedback opgevraagd via het systeem.</p>
  </div>
  ` : ''}

  <h2>Integriteitslog</h2>
  <div class="metadata">
    <p><strong>Copy-paste gedetecteerd:</strong> ${copyPasteTriggered ? 'Ja' : 'Nee'}</p>
    <p><strong>Aantal woorden:</strong> ${finalText.trim().split(/\s+/).filter(Boolean).length}</p>
    <p><strong>Feedback aangevraagd:</strong> ${hasRequestedFeedbackOnce ? 'Ja' : 'Nee'}</p>
  </div>

  <div class="footer">
    <p>Gegenereerd door PUNT! - Een intelligente schrijfomgeving voor het onderwijs.</p>
    <p>© ${new Date().getFullYear()} - Dit document is automatisch gegenereerd.</p>
  </div>
</body>
</html>
    `;

    console.log('Generating PDF for code:', code);

    // For now, return the HTML as a simple text file
    // In production, you would use a PDF library like puppeteer or wkhtmltopdf
    const pdfBlob = new Blob([html], { type: 'text/html' });

    return new Response(pdfBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="opdracht-${code}-${new Date().toISOString().split('T')[0]}.html"`
      }
    });

  } catch (error) {
    console.error('Error in generate-pdf:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
