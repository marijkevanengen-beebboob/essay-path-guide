type FeedbackItem = {
  criterionId: string;
  criterionLabel: string;
  range: { start: number; end: number };
  hint: string;
  type: "spelling" | "grammar" | "structure" | "content";
};

export async function generateFeedback(
  text: string,
  level: string,
  assignmentText: string,
  criteria: Array<{ id: string; label: string; description: string }>
): Promise<FeedbackItem[]> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Set VITE_OPENROUTER_API_KEY in your environment.');
  }

  const criteriaText = criteria.map(c => `- ${c.label}: ${c.description}`).join('\n');

  const prompt = `Je bent een docent Nederlands die feedback geeft op niveau ${level}. 

OPDRACHT:
${assignmentText}

BEOORDELINGSCRITERIA:
${criteriaText}

TEKST VAN LEERLING:
${text}

Geef maximaal 5 concrete, constructieve feedbackpunten. Voor elk feedbackpunt:
1. Selecteer een specifiek tekstfragment (citeer letterlijk, minimaal 10 woorden)
2. Koppel het aan één criterium
3. Geef een korte, heldere tip (max 40 woorden)

Antwoord in dit EXACTE JSON-formaat:
{
  "feedback": [
    {
      "criterionId": "id_van_criterium",
      "textFragment": "exact geciteerde tekst uit leerlingtekst",
      "hint": "concrete feedback tip",
      "type": "content"
    }
  ]
}

BELANGRIJK:
- Citeer tekstfragmenten EXACT zoals ze in de tekst staan
- Gebruik alleen criterion IDs uit de lijst hierboven
- Type is altijd "content"
- Maximaal 5 feedbackpunten`;

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
        max_tokens: 1000,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('Invalid response format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const feedbackItems: FeedbackItem[] = [];

    // Map AI feedback to our format with actual text ranges
    for (const item of parsed.feedback || []) {
      const fragment = item.textFragment;
      const startIndex = text.indexOf(fragment);
      
      if (startIndex === -1) {
        console.warn('Text fragment not found in original text:', fragment);
        continue;
      }

      const criterion = criteria.find(c => c.id === item.criterionId);
      
      feedbackItems.push({
        criterionId: item.criterionId,
        criterionLabel: criterion?.label || 'Algemeen',
        range: {
          start: startIndex,
          end: startIndex + fragment.length
        },
        hint: item.hint,
        type: item.type || 'content'
      });
    }

    return feedbackItems;
  } catch (error) {
    console.error('Error generating feedback:', error);
    throw error;
  }
}

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
