"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, User, Copy, Edit2, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { MemoizedMarkdown } from "../markdown/MarkdownRenderer";
import type { AiChatMessage } from "@/ai/chat-types";
import type { AiSource } from "@/store/ai-store";
import { useChatStore } from "@/store/chat-store";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

interface ChatMessagesProps {
  messages: (AiChatMessage & { id?: string; chatId?: string })[];
  resolvedSource: AiSource | null;
}

export function ChatMessages({ messages, resolvedSource }: ChatMessagesProps) {
  const { t } = useTranslation("commons", { keyPrefix: "chat-page" });
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const updateMessage = useChatStore((state) => state.updateMessage);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const scrollToBottom = (smooth = true) => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement;
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: smooth ? "smooth" : "instant",
      });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => scrollToBottom(true), 100);
    return () => clearTimeout(timeout);
  }, [messages]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t("actions.copied", { defaultValue: "Copied" }));
    } catch {
      toast.error(t("errors.copy-failed", { defaultValue: "Copy failed" }));
    }
  };

  const handleEditStart = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleEditSave = async (
    chatId: string | undefined,
    messageId: string,
  ) => {
    if (!chatId || !editContent.trim()) return;
    try {
      await updateMessage(chatId, messageId, { content: editContent.trim() });
      setEditingId(null);
      toast.success(t("actions.updated", { defaultValue: "Message updated" }));
    } catch (e) {
      console.error(e);
      toast.error(t("errors.update-failed", { defaultValue: "Update failed" }));
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden relative">
      <ScrollArea ref={scrollAreaRef} className="h-full">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
          {messages.length === 0 ? (
            <div className="mt-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-muted p-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-lg font-semibold">
                  {t("conversation.empty-title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Start a new conversation with{" "}
                  <span className="font-medium text-foreground">
                    {resolvedSource?.name}
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                key={msg.id}
                className={cn(
                  "group flex gap-4 text-sm md:text-base",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div
                  className={cn(
                    "flex min-w-0 max-w-[85%] flex-col gap-1 rounded-2xl shadow-sm md:max-w-[75%]",
                    msg.role === "user"
                      ? "bg-primary/5 text-foreground rounded-tr-sm"
                      : "bg-muted/30 border border-border/50 rounded-tl-sm",
                  )}
                >
                  {editingId === msg.id ? (
                    <div className="flex flex-col gap-2 p-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] bg-background"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditCancel}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(msg.chatId, msg.id!)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word leading-normal">
                        <MemoizedMarkdown source={msg.content || "..."} />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!editingId && msg.id && (
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 pb-2 opacity-0 transition-opacity group-hover:opacity-100",
                        msg.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(msg.content)}
                        title="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditStart(msg.id!, msg.content)}
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {/* Optional: Add Regenerate button for assistant only */}
                      {/* {msg.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          title="Regenerate (Not implemented)"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )} */}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
