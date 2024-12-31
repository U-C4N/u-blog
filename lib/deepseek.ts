import { env } from '@/env.mjs'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY

export async function fixGrammar(text: string): Promise<string> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional editor. Fix any grammar, spelling, or punctuation errors in the text while maintaining the original meaning and style. Only return the corrected text without any explanations.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    return data.choices[0].message.content || text;
  } catch (error) {
    console.error('Error fixing grammar:', error);
    throw error;
  }
}

export async function generateArticle(topic: string, research: { answer: string, sources: Array<{ title: string, url: string, snippet: string }> }): Promise<string> {
  try {
    const sourceInfo = research.sources.map(source => 
      `Title: ${source.title}\nURL: ${source.url}\nSummary: ${source.snippet}`
    ).join('\n\n');

    const prompt = `Write a comprehensive, engaging article about "${topic}". 
    
    Research Summary:
    ${research.answer}
    
    Additional Sources:
    ${sourceInfo}

    Requirements:
    1. Write in a clear, engaging style with a professional tone
    2. Structure the content with clear sections using Markdown headings
    3. Include an introduction that hooks the reader
    4. Present key findings and insights from the research
    5. Support claims with data and examples from the sources
    6. Add inline citations using [Source Title] format
    7. Include a conclusion that summarizes key points
    8. Add a "References" section at the end listing all sources
    9. Format everything in Markdown
    10. Keep paragraphs concise and readable`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert writer who creates engaging, well-researched articles. Your writing is clear, informative, and backed by credible sources.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.statusText}`)
    }

    const data = await response.json();
    return data.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating article:', error);
    throw error;
  }
}