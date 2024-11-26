import OpenAI from 'openai';

const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OpenAI API key');
}

export const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true
});

export async function fixGrammar(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional editor. Fix any grammar, spelling, or punctuation errors in the text while maintaining the original meaning and style. Only return the corrected text without any explanations."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error('Error fixing grammar:', error);
    throw error;
  }
}

export async function generateResearchContent(topic: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional researcher and writer. Create a well-researched, engaging article about the given topic. Include relevant facts, statistics, and insights. Format the content in Markdown."
        },
        {
          role: "user",
          content: `Write a comprehensive article about: ${topic}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating research content:', error);
    throw error;
  }
}