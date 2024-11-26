import { researchWithTavily } from './tavily'

export async function researchTopic(topic: string) {
  return await researchWithTavily(topic)
}