// CopilotHandler: Dedicated provider for GitHub Copilot, based on OpenAiHandler

import OpenAI from "openai"
import { ApiHandler, CommonApiHandlerOptions } from "../index"
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

interface CopilotHandlerOptions extends CommonApiHandlerOptions {
	copilotAccessToken?: string
	copilotBaseUrl?: string
	copilotHeaders?: Record<string, string>
	copilotModelId?: string
	// Add more Copilot-specific options as needed
}

export class CopilotHandler implements ApiHandler {
	private options: CopilotHandlerOptions
	private client: OpenAI | undefined

	constructor(options: CopilotHandlerOptions) {
		this.options = options
	}

	// TODO: Implement device authorization and access token refresh logic here

	private ensureClient(): OpenAI {
		if (!this.client) {
			if (!this.options.copilotAccessToken) {
				throw new Error("Copilot access token is required")
			}
			try {
				this.client = new OpenAI({
					baseURL: this.options.copilotBaseUrl || "https://api.githubcopilot.com",
					apiKey: this.options.copilotAccessToken,
					defaultHeaders: {
						...(this.options.copilotHeaders || {}),
						"Copilot-Integration-Id": "vscode-chat",
					},
				})
			} catch (error: any) {
				throw new Error(`Error creating Copilot client: ${error.message}`)
			}
		}
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
		const client = this.ensureClient()
		const modelId = this.options.copilotModelId ?? ""
		// TODO: Add Copilot-specific message formatting if needed

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		const stream = await client.chat.completions.create({
			model: modelId,
			messages: openAiMessages,
			stream: true,
			stream_options: { include_usage: true },
		})
		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta
			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}
			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
				}
			}
		}
	}

	getModel(): { id: string; info: any } {
		return {
			id: this.options.copilotModelId ?? "",
			info: {}, // TODO: Provide Copilot model info if needed
		}
	}
}
