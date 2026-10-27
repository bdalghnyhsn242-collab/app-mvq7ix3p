export type AgentToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentTool = {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

export type AgentLoopMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCall?: AgentToolCall;
};

export type RunAgentLoopInput = {
  messages: AgentLoopMessage[];
  tools?: AgentTool[];
  model?: string;
  maxTurns?: number;
  onMessage?: (message: AgentLoopMessage) => Promise<void> | void;
};

export type RunAgentLoopOutput = {
  finalMessage: string;
  messages: AgentLoopMessage[];
};

async function callModel(messages: AgentLoopMessage[], model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for server-side model calls");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

export async function runAgentLoop({
  messages,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  maxTurns = 4,
  onMessage,
}: RunAgentLoopInput): Promise<RunAgentLoopOutput> {
  const workingMessages = [...messages];

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const content = await callModel(workingMessages, model);
    const assistantMessage: AgentLoopMessage = {
      role: "assistant",
      content,
    };

    workingMessages.push(assistantMessage);
    await onMessage?.(assistantMessage);

    return {
      finalMessage: content,
      messages: workingMessages,
    };
  }

  const finalMessage = workingMessages[workingMessages.length - 1]?.content ?? "";
  return {
    finalMessage,
    messages: workingMessages,
  };
}
