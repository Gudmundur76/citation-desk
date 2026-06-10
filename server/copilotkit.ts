/**
 * CopilotKit runtime integration using the v2 API.
 *
 * Uses BuiltInAgent with a Vercel AI SDK LanguageModel pointed at the Manus
 * built-in forge LLM endpoint, and mounts the handler at /api/copilotkit
 * inside the existing Express server. No separate process or port is required.
 */
import type { Express } from 'express'
import { createOpenAI } from '@ai-sdk/openai'
import { CopilotRuntime, BuiltInAgent } from '@copilotkit/runtime/v2'
import { createCopilotExpressHandler } from '@copilotkit/runtime/v2/express'
import { ENV } from './_core/env'

export function registerCopilotKit(app: Express): void {
  // Point the Vercel AI SDK OpenAI provider at the Manus forge LLM endpoint
  const forgeBaseUrl =
    ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, '')}/v1`
      : 'https://forge.manus.im/v1'

  const forgeProvider = createOpenAI({
    apiKey: ENV.forgeApiKey || 'placeholder',
    baseURL: forgeBaseUrl,
  })

  // Use a model that is available on the Manus forge endpoint
  const languageModel = forgeProvider('gpt-4.1-mini')

  const agent = new BuiltInAgent({
    model: languageModel,
  })

  const runtime = new CopilotRuntime({
    agents: { default: agent },
  })

  const handler = createCopilotExpressHandler({
    runtime,
    basePath: '/api/copilotkit',
    mode: 'single-route',
    cors: true,
  })

  // Mount the Express router returned by createCopilotExpressHandler
  app.use(handler)

  console.log('[CopilotKit] Runtime mounted at /api/copilotkit (Manus forge LLM)')
}
