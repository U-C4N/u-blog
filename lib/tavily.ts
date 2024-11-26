import { env } from '@/env.mjs'

const TAVILY_API_KEY = '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'

export async function researchWithTavily(topic: string) {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query: topic,
        search_depth: "advanced",
        include_answer: true,
        max_results: 5
      })
    })

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      answer: data.answer,
      sources: data.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.content
      }))
    }
  } catch (error) {
    console.error('Error researching with Tavily:', error)
    throw error
  }
}