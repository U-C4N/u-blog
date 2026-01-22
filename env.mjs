import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    TAVILY_API_KEY: z.string().default(""),
    GROQ_API_KEY: z.string().default(""),
  },
  client: {
    // Make client env optional to avoid runtime crashes if not set
    NEXT_PUBLIC_DEEPSEEK_API_KEY: z.string().default(""),
    NEXT_PUBLIC_SITE_URL: z.string().min(1).default("https://yoursite.com"),
  },
  runtimeEnv: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    NEXT_PUBLIC_DEEPSEEK_API_KEY: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
}) 