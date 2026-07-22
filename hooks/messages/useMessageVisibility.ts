"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MessageUserStateRow = {
  message_id: number;
};

type UseMessageVisibilityResult = {
  hiddenMessageIds: Set<number>;
  loadHiddenMessageIds: (userId: string) => Promise<Set<number>>;
  hideMessagesForUser: (
    userId: string,
    messageIds: number[],
  ) => Promise<void>;
  restoreMessagesForUser: (
    userId: string,
    messageIds: number[],
  ) => Promise<void>;
};

export default function useMessageVisibility(): UseMessageVisibilityResult {
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<number>>(
    () => new Set(),
  );

  const loadHiddenMessageIds = useCallback(
    async (userId: string): Promise<Set<number>> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("message_user_states")
        .select("message_id")
        .eq("user_id", userId)
        .not("hidden_at", "is", null);

      if (error) {
        throw error;
      }

      const nextHiddenIds = new Set(
        ((data ?? []) as MessageUserStateRow[]).map(
          (state) => state.message_id,
        ),
      );

      setHiddenMessageIds(nextHiddenIds);

      return nextHiddenIds;
    },
    [],
  );

  const hideMessagesForUser = useCallback(
    async (userId: string, messageIds: number[]): Promise<void> => {
      if (messageIds.length === 0) return;

      const supabase = createClient();
      const timestamp = new Date().toISOString();

      const states = messageIds.map((messageId) => ({
        message_id: messageId,
        user_id: userId,
        hidden_at: timestamp,
        updated_at: timestamp,
      }));

      const { error } = await supabase
        .from("message_user_states")
        .upsert(states, {
          onConflict: "message_id,user_id",
        });

      if (error) {
        throw error;
      }

      setHiddenMessageIds((current) => {
        const next = new Set(current);

        messageIds.forEach((messageId) => {
          next.add(messageId);
        });

        return next;
      });
    },
    [],
  );

  const restoreMessagesForUser = useCallback(
    async (userId: string, messageIds: number[]): Promise<void> => {
      if (messageIds.length === 0) return;

      const supabase = createClient();

      const { error } = await supabase
        .from("message_user_states")
        .delete()
        .eq("user_id", userId)
        .in("message_id", messageIds);

      if (error) {
        throw error;
      }

      setHiddenMessageIds((current) => {
        const next = new Set(current);

        messageIds.forEach((messageId) => {
          next.delete(messageId);
        });

        return next;
      });
    },
    [],
  );

  return {
    hiddenMessageIds,
    loadHiddenMessageIds,
    hideMessagesForUser,
    restoreMessagesForUser,
  };
}
