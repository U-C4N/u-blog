import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    TAVILY_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_DEEPSEEK_API_KEY: z.string().min(1),
  },
  runtimeEnv: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    NEXT_PUBLIC_DEEPSEEK_API_KEY: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
  },
}) 