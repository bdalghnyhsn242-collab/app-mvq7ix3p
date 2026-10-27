import type React from "react";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AIMessageComposerProps = {
  onSend: (message: string) => Promise<void>;
  placeholder?: string;
};

export function AIMessageComposer({ onSend, placeholder }: AIMessageComposerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend(trimmed);
      setMessage("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder ?? "Ask the backend AI function to do something..."}
        className="min-h-24 resize-y"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSending || !message.trim()}>
          <Send className="h-4 w-4" />
          {isSending ? "Sending" : "Send"}
        </Button>
      </div>
    </form>
  );
}
