const GEMINI_API_KEY = 'AIzaSyA19u0p1ccNS8JysypFjmvvlG3iZ4KAUqE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent';

export interface AIRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  error?: string;
}

export async function generateAIResponse(request: AIRequest): Promise<AIResponse> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: request.context ? `${request.context}\n\n${request.prompt}` : request.prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: request.maxTokens || 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return { text };
  } catch (error) {
    console.error('AI request failed:', error);
    return { 
      text: '', 
      error: error instanceof Error ? error.message : 'Failed to generate response' 
    };
  }
}

export async function estimateCost(description: string, location: string = 'USA'): Promise<AIResponse> {
  const prompt = `As a home improvement expert, estimate the cost for this project:

${description}

Location: ${location}

Provide a breakdown including:
1. Materials cost estimate
2. Labor cost estimate (if DIY vs professional)
3. Total estimated cost range
4. Key cost factors to consider

Format the response in a clear, organized way.`;

  return generateAIResponse({ prompt });
}

export async function suggestMaterials(projectDescription: string): Promise<AIResponse> {
  const prompt = `Based on this home improvement project, suggest required materials:

${projectDescription}

List all materials needed including:
- Item name
- Quantity needed
- Estimated unit cost
- Where to buy (store suggestions)
- Any alternatives or upgrades

Organize by category (e.g., lumber, hardware, tools, safety equipment).`;

  return generateAIResponse({ prompt });
}

export async function breakdownTasks(projectDescription: string): Promise<AIResponse> {
  const prompt = `Break down this home improvement project into detailed tasks:

${projectDescription}

For each task provide:
1. Task name
2. Description
3. Estimated time
4. Required skills
5. Dependencies (what needs to be done first)
6. Safety considerations

Order tasks in the most logical sequence.`;

  return generateAIResponse({ prompt });
}

export async function troubleshoot(problem: string, projectContext: string): Promise<AIResponse> {
  const prompt = `Help troubleshoot this home improvement issue:

Problem: ${problem}
Project context: ${projectContext}

Provide:
1. Possible causes
2. Diagnostic steps
3. Solutions for each cause
4. When to call a professional
5. Safety warnings`;

  return generateAIResponse({ prompt });
}