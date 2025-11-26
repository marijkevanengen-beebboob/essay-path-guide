export async function generateAIReflection(
  version1: string,
  finalVersion: string,
  criteria: Array<{ label: string; description: string }>
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('OpenRouter API key not found, skipping AI reflection');
    return '';
  }

  const criteriaText = criteria.map(c => `- ${c.label}: ${c.description}`).join('\n');

  const prompt = `Je bent een docent Nederlands. Analyseer kort (max 150 woorden) de verbeteringen tussen twee tekstversies van een leerling.

Beoordelingscriteria:
${criteriaText}

VERSIE 1 (na eerste feedback):
${version1}

EINDVERSIE:
${finalVersion}

Geef een bondige, bemoedigende analyse van de belangrijkste verbeteringen. Focus op concrete veranderingen in relatie tot de criteria. Schrijf in de derde persoon ("De leerling heeft...").`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return '';
  }
}
