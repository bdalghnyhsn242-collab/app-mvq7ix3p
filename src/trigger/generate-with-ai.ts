import { queue, task } from "@trigger.dev/sdk";
import { runAgentLoop, type AgentLoopMessage } from "@/lib/ai/agentLoop";

const aiQueue = queue({
  name: "ai-generation",
  concurrencyLimit: 4,
});

export type GenerateWithAiInput = {
  messages: AgentLoopMessage[];
  model?: string;
  userId: string;
  conversationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export type GenerateWithAiOutput = {
  finalMessage: string;
};

export const generateWithAiTask = task({
  id: "generate-with-ai",
  queue: aiQueue,
  maxDuration: 3600,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateWithAiInput): Promise<GenerateWithAiOutput> => {
    const result = await runAgentLoop({
      messages: payload.messages,
      model: payload.model,
    });

    return {
      finalMessage: result.finalMessage,
    };
  },
});
