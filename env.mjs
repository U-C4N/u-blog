import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    TAVILY_API_KEY: z.string().min(1),
    DEEPSEEK_API_KEY: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
}) 