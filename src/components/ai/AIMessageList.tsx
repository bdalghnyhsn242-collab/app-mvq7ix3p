import type React from "react";
import { Bot, Braces, CheckCircle2, CircleAlert, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AIMessage } from "@/lib/aiMessages";
import { cn } from "@/lib/utils";

type AIMessageListProps = {
  messages: AIMessage[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
};

function messageIcon(message: AIMessage) {
  switch (message.message_type) {
    case "user_message":
      return <UserRound className="h-4 w-4" />;
    case "assistant_message":
      return <Bot className="h-4 w-4" />;
    case "tool_call":
      return <Wrench className="h-4 w-4" />;
    case "tool_result":
      return <CheckCircle2 className="h-4 w-4" />;
    case "system_event":
      return <CircleAlert className="h-4 w-4" />;
    default:
      return <Braces className="h-4 w-4" />;
  }
}

function messageLabel(message: AIMessage) {
  return message.message_type.replace(/_/g, " ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function AIMessageList({ messages, isLoading, emptyState }: AIMessageListProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <Card className="flex min-h-40 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {emptyState ?? "No AI messages yet."}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <article
          key={message.id}
          className={cn(
            "rounded-lg border bg-card p-4 shadow-sm",
            message.role === "user" && "ml-auto max-w-[85%] bg-muted/70",
            message.role === "assistant" && "mr-auto max-w-[92%]",
            message.role === "tool" && "border-dashed bg-accent/25",
            message.role === "system" && "bg-secondary/50",
          )}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {messageIcon(message)}
              {message.role}
            </span>
            <Badge variant="outline">{messageLabel(message)}</Badge>
            <span>{formatTimestamp(message.created_at)}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-6">{message.message}</div>
          {message.metadata ? (
            <details className="mt-3 rounded-md border bg-background p-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground">metadata</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(message.metadata, null, 2)}
              </pre>
            </details>
          ) : null}
        </article>
      ))}
      {isLoading ? <div className="text-sm text-muted-foreground">Loading messages...</div> : null}
    </div>
  );
}
