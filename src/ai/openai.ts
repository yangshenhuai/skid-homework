import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { AiChatMessage } from "./chat-types";
import { BaseAiClient } from "./base-client";
import { base64Decoder } from "@/utils/encoding";

export type OpenAiModel = {
    name: string;
    displayName: string;
};

const DEFAULT_OPENAI_ROOT = "https://api.openai.com/v1";

function normalizeBaseUrl(baseUrl?: string) {
    return (baseUrl ?? DEFAULT_OPENAI_ROOT).replace(/\/$/, "");
}

export class OpenAiClient extends BaseAiClient {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL: normalizeBaseUrl(baseUrl),
      dangerouslyAllowBrowser: true,
    });
  }

  /**
   * Sends a request with an image (Vision API).
   */
  async sendMedia(
    media: string,
    mimeType: string,
    prompt?: string,
    model = "gpt-5.2",
    callback?: (text: string) => void,
    options?: { onlineSearch?: boolean },
  ) {
    const messages: ChatCompletionMessageParam[] = [];

    if (this.systemPrompts.length > 0) {
      const systemPrompt = this.buildSystemPrompt();
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    const contentParts: Array<
      | { type: "text"; text: string }
      | {
          type: "image_url";
          image_url: { url: string; detail?: "auto" | "low" | "high" };
        }
    > = [];

    if (prompt) {
      contentParts.push({
        type: "text",
        text: prompt,
      });
    }

    if (mimeType.startsWith("image/")) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${media}`,
          detail: "auto",
        },
      });
    } else if (mimeType === "application/pdf") {
      console.error("PDF media type is not directly supported for completion API.");
    } else {
      try {
        let charset = "utf-8";
        const charsetMatch = mimeType.match(/charset=([^;]+)/i);
        if (charsetMatch && charsetMatch[1]) {
          charset = charsetMatch[1].trim();
        }
        let text: string;
        try {
          text = await base64Decoder(media, charset);
        } catch {
          text = await base64Decoder(media, "utf-8");
        }
        contentParts.push({
          type: "text",
          text: `\n\n[File Content]\n${text}\n\n`,
        });
      } catch (e) {
        throw new Error("Failed to decode base64 text: " + (e instanceof Error ? e.message : String(e)));
      }
    }

    messages.push({
      role: "user",
      content: contentParts,
    });

    if (options?.onlineSearch) {
      return this._executeResponsesStream(model, messages, callback, options);
    }
    return this._executeStream(model, messages, callback);
  }

  /**
   * Sends a standard text-only chat request.
   */
  async sendChat(
    messages: AiChatMessage[],
    model = "gpt-5.2",
    callback?: (text: string) => void,
    options?: { onlineSearch?: boolean },
  ) {
    const openAiMessages: ChatCompletionMessageParam[] = [];

    if (this.systemPrompts.length > 0) {
      const systemPrompt = this.buildSystemPrompt();
      openAiMessages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    this.logAiQuery(model, messages);

    for (const message of messages) {
      const trimmed = message.content?.trim();
      if (!trimmed) continue;

      const role =
        message.role === "assistant"
          ? "assistant"
          : message.role === "system"
            ? "system"
            : "user";

      openAiMessages.push({
        role: role,
        content: trimmed,
      });
    }

    if (options?.onlineSearch) {
      return this._executeResponsesStream(model, openAiMessages, callback, options);
    }
    return this._executeStream(model, openAiMessages, callback);
  }

  private async _executeStream(
      model: string,
      messages: ChatCompletionMessageParam[],
      callback?: (text: string) => void,
  ): Promise<string> {
      const stream = await this.client.chat.completions.create({
          model,
          messages,
          stream: true,
      });

      let aggregated = "";

      for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";

          if (delta) {
              aggregated += delta;
              callback?.(delta);
          }
      }

      return aggregated.trim();
  }

  /**
   * Streaming helper using the Responses API to support web search.
   */
  private async _executeResponsesStream(
      model: string,
      messages: ChatCompletionMessageParam[],
      callback?: (text: string) => void,
      options?: { onlineSearch?: boolean },
  ): Promise<string> {
      // Choose the correct web search tool name for the model family.
      const toolType = model.includes("4.1") || model.includes("4o") ? "web_search_preview" : "web_search";

      const toolsUsed = options?.onlineSearch ? [{type: toolType}] : undefined;
      let stream: AsyncIterable<{ type: string; delta?: string }>;

      try {
          // Type assertion to bypass missing definitions if any
          const responsesApi = (this.client as unknown as { responses: { create: (opts: unknown) => Promise<AsyncIterable<{ type: string; delta?: string }>> } }).responses;
          stream = await responsesApi.create({
              model,
              tools: toolsUsed,
              stream: true,
              input: messages
          });
      } catch (err) {
          const message = (err as Error)?.message ?? "";
          // Graceful fallback: if the model rejects web search, retry without it.
          const notSupported =
              message.includes("not supported") ||
              message.includes("web search options not supported") ||
              message.includes("Web search options not supported");
          if (options?.onlineSearch && notSupported) {
              console.warn(
                  `Web search not supported for model ${model}; falling back without search.`,
              );
              return this._executeStream(model, messages, callback);
          }
          throw err;
      }
      let aggregated = "";

      // Iterate over the Server-Sent Events
      for await (const event of stream) {
          if (event.type === 'response.output_text.delta') {
              const delta = event.delta;

              if (delta) {
                  aggregated += delta;
                  callback?.(delta);
              }
          }
      }
      return aggregated.trim();
  }

  async getAvailableModels(): Promise<OpenAiModel[]> {
      const response = await this.client.models.list();

      return response.data.map((model) => ({
          name: model.id,
          displayName: model.id,
      }));
  }
}
