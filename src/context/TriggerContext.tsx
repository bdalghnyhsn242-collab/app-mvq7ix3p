import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useTriggerToken } from "@/hooks/useTriggerToken";

type RunSubscription = {
  runId: string;
  accessToken?: string | null;
};

type TriggerContextValue = {
  activeRunIds: string[];
  count: number;
  isReady: boolean;
  tokenError: string | null;
  addRunSubscription: (runId: string, accessToken?: string | null) => void;
  removeRunSubscription: (runId: string) => void;
};

const TriggerContext = createContext<TriggerContextValue | undefined>(undefined);

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CANCELLED",
  "TIMED_OUT",
  "ERROR",
  "ERRORED",
  "EXPIRED",
  "SUCCEEDED",
  "SUCCESS",
  "INTERRUPTED",
]);

function isTerminalStatus(status: string | null | undefined) {
  if (!status) return false;
  return TERMINAL_STATUSES.has(String(status).toUpperCase());
}

export const TriggerProvider = ({ children }: { children: React.ReactNode }) => {
  const [subscriptions, setSubscriptions] = useState<RunSubscription[]>([]);
  const { token, error: tokenError } = useTriggerToken();

  const addRunSubscription = useCallback((runId: string, accessToken?: string | null) => {
    setSubscriptions((previous) => {
      const existing = previous.find((subscription) => subscription.runId === runId);
      if (existing) {
        return previous.map((subscription) =>
          subscription.runId === runId
            ? { ...subscription, accessToken: accessToken ?? subscription.accessToken }
            : subscription,
        );
      }

      return [...previous, { runId, accessToken }];
    });
  }, []);

  const removeRunSubscription = useCallback((runId: string) => {
    setSubscriptions((previous) => previous.filter((subscription) => subscription.runId !== runId));
  }, []);

  const value = useMemo(
    () => ({
      activeRunIds: subscriptions.map((subscription) => subscription.runId),
      count: subscriptions.length,
      isReady: Boolean(token) || subscriptions.length === 0,
      tokenError,
      addRunSubscription,
      removeRunSubscription,
    }),
    [addRunSubscription, removeRunSubscription, subscriptions, token, tokenError],
  );

  return (
    <TriggerContext.Provider value={value}>
      {children}
      {subscriptions.map((subscription) => (
        <RunSubscriber
          key={subscription.runId}
          runId={subscription.runId}
          accessToken={subscription.accessToken ?? token}
          onTerminalStatus={removeRunSubscription}
        />
      ))}
    </TriggerContext.Provider>
  );
};

export const useTrigger = () => {
  const context = useContext(TriggerContext);
  if (!context) {
    throw new Error("useTrigger must be used within a TriggerProvider");
  }

  return context;
};

function RunSubscriber({
  runId,
  accessToken,
  onTerminalStatus,
}: {
  runId: string;
  accessToken?: string | null;
  onTerminalStatus: (runId: string) => void;
}) {
  const { run } = useRealtimeRun(runId, {
    accessToken: accessToken || "invalid",
    enabled: Boolean(accessToken),
  });

  const status = ((run as any)?.status as string | undefined) ?? null;

  useEffect(() => {
    if (isTerminalStatus(status)) {
      onTerminalStatus(runId);
    }
  }, [onTerminalStatus, runId, status]);

  return null;
}
