import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    GROQ_API_KEY: z.string().default(""),
  },
  client: {
    // Make client env optional to avoid runtime crashes if not set
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://uc4n.com"),
  },
  runtimeEnv: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
}) 
