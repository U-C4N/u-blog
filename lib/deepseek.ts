import { env } from '@/env.mjs'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = env.NEXT_PUBLIC_DEEPSEEK_API_KEY

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

export async function optimizeForSEO(content: string, onProgress?: (partialContent: string) => void): Promise<string> {
  try {
    // Detect if content is in Turkish
    const isTurkish = /[ğüşıöçĞÜŞİÖÇ]/.test(content);
    
    const systemPrompt = isTurkish 
      ? 'Sen bir SEO uzmanısın. Verilen metni hiç değiştirmeden sadece markdown formatına çevir. Metindeki içeriği kesinlikle değiştirme, sadece başlıklar (H1, H2, H3), kalın yazı, italik yazı, listeler ve tablolar gibi markdown formatlamalarını ekle. Tablolar için özellikle dikkat et - tablo yapısını korumalı ve düzgün markdown tablo formatında dönüştürmelisin. Örnek markdown tablo yapısı:\n\n| Başlık 1 | Başlık 2 |\n| --- | --- |\n| Veri 1 | Veri 2 |\n\n| ve - işaretlerinin doğru formatta olduğundan emin ol. Tablo başlık hücreleri ve veri hücreleri arasında --- ile ayırıcı satır kullan. Cevabında sadece formatlanmış metni döndür, hiçbir açıklama ekleme ve sonucu markdown kod blokları (``` işaretleri) içine alma. Sadece metni doğrudan markdown formatında ver.'
      : 'You are an SEO expert. Convert the given text to markdown format without changing any of the content. Do not modify the actual text content at all, just add markdown formatting like headings (H1, H2, H3), bold, italic, lists, and tables etc. For tables, use proper markdown table structure, for example:\n\n| Header 1 | Header 2 |\n| --- | --- |\n| Data 1 | Data 2 |\n\nReturn only the formatted text without any explanations and do not wrap the result in markdown code blocks (``` marks). Just give the text directly in markdown format.';

    const payload = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      stream: !!onProgress // Enable streaming if onProgress callback is provided
    };

    if (onProgress) {
      // Streaming approach
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Deepseek API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body reader not available');

      let optimizedContent = '';
      let decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.choices && parsedData.choices[0].delta?.content) {
                const content = parsedData.choices[0].delta.content;
                optimizedContent += content;
                // Remove markdown block syntax if present
                const cleanContent = optimizedContent.replace(/```markdown\n?|```\n?|```md\n?/g, '');
                onProgress(cleanContent);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
      
      // Final cleanup
      const finalContent = optimizedContent.replace(/```markdown\n?|```\n?|```md\n?/g, '');
      return finalContent;
    } else {
      // Non-streaming approach (original implementation)
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Deepseek API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Remove any markdown code block syntax if it's accidentally added
      let optimizedContent = data.choices[0].message.content || content;
      optimizedContent = optimizedContent.replace(/```markdown\n?|```\n?|```md\n?/g, '');
      
      return optimizedContent;
    }
  } catch (error) {
    console.error('Error optimizing for SEO:', error);
    throw error;
  }
}