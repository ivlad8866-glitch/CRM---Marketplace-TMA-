import { useCallback } from "react";
import type { Message } from "../types";
import {
  agentTextReplies,
  customerTextReplies,
  replyStickers,
} from "../data/demo-data";

type UseAutoReplyOptions = {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useAutoReply({ setMessages, setIsTyping }: UseAutoReplyOptions) {
  const scheduleAutoReply = useCallback(
    (isAdmin: boolean) => {
      setIsTyping(true);
      window.setTimeout(() => {
        const roll = Math.random();
        let replyMsg: Message;
        const replyAuthor = isAdmin ? "customer" : "agent";

        if (roll < 0.55) {
          const pool = isAdmin ? customerTextReplies : agentTextReplies;
          replyMsg = {
            id: `m-${Date.now() + 1}`,
            author: replyAuthor,
            text: pool[Math.floor(Math.random() * pool.length)],
            time: "сейчас",
            type: "text",
          };
        } else if (roll < 0.8) {
          replyMsg = {
            id: `m-${Date.now() + 1}`,
            author: replyAuthor,
            text: "",
            time: "сейчас",
            type: "sticker",
            sticker: replyStickers[Math.floor(Math.random() * replyStickers.length)],
          };
        } else {
          replyMsg = {
            id: `m-${Date.now() + 1}`,
            author: replyAuthor,
            text: "",
            time: "сейчас",
            type: "voice",
            voiceDuration: Math.floor(Math.random() * 25) + 3,
            voiceUrl: "",
          };
        }
        setMessages((prev) => [...prev, replyMsg]);
        setIsTyping(false);
      }, 900);
    },
    [setMessages, setIsTyping]
  );

  return { scheduleAutoReply };
}
