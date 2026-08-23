import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  "What does AQI 200 mean?",
  "How do I file a report?",
  "Why is Delhi air so bad?",
  "How to protect myself from smog?",
  "What causes stubble burning?",
  "Is today safe to go outside?",
];

export function AirQualityChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hi! I'm NirVayu AI 🌿 I can help you with air quality questions, AQI levels, health tips, and how to report pollution in Delhi. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNewMessage(false);
    }
  }, [isOpen, messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build history excluding the welcome message and the latest user message
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await apiRequest("POST", "/api/chat", {
        message: text.trim(),
        history,
      });
      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.reply || data.error || "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (!isOpen) setHasNewMessage(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-md whitespace-nowrap"
            >
              Ask NirVayu AI ✨
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            "relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300",
            "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
            "focus:outline-none focus:ring-4 focus:ring-emerald-300/50"
          )}
          aria-label="Toggle NirVayu AI Chat"
          id="chatbot-toggle-btn"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <MessageCircle className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unread dot */}
          <AnimatePresence>
            {hasNewMessage && !isOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"
              />
            )}
          </AnimatePresence>

          {/* Pulse ring */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20 pointer-events-none" />
          )}
        </motion.button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/60"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Wind className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-300 border-2 border-teal-600 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">NirVayu AI</p>
                <p className="text-emerald-100 text-[11px]">Air Quality Assistant · Delhi</p>
              </div>
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-background/95 backdrop-blur-sm px-3 py-3 space-y-3" style={{ maxHeight: "340px" }}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "model" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={cn("max-w-[80%] flex flex-col gap-0.5", msg.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 justify-start"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (only if just opened / first message) */}
            {messages.length <= 1 && (
              <div className="bg-background/95 px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {QUICK_SUGGESTIONS.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="shrink-0 text-[11px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="bg-background border-t border-border px-3 py-2.5 flex gap-2 items-center">
              <Input
                ref={inputRef}
                id="chatbot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about AQI, pollution, health tips…"
                className="flex-1 text-sm h-9 rounded-xl border-border/60 focus-visible:ring-emerald-400/50"
                disabled={isLoading}
              />
              <Button
                id="chatbot-send-btn"
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
