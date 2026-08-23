import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Wind, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export function AirQualityChatbot() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [autoSpeech, setAutoSpeech] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Pre-load and listen to speech synthesis voices as Chrome loads them asynchronously
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Helper to strictly find a female voice for Hindi/English
  const getFemaleVoice = (lang: string, voicesList: SpeechSynthesisVoice[]) => {
    const isHi = lang === "hi";
    const langPrefix = isHi ? "hi" : "en";
    const voices = voicesList.length > 0 ? voicesList : (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);

    const femaleKeywords = [
      "zira", "hazel", "heera", "swara", "kalpana", "samantha", "victoria", 
      "karen", "aria", "jenny", "sara", "sonia", "veena", "catherine", 
      "susan", "lisa", "amy", "emma", "joanna", "female", "woman", "girl",
      "google us english", "google uk english female", "google हिन्दी", 
      "microsoft zira", "microsoft hazel", "microsoft heera", "natural"
    ];

    const maleKeywords = [
      "david", "mark", "george", "ravi", "hemant", "guy", "stefan", 
      "james", "alex", "fred", "daniel", "tom", "oliver", "rishi", "male", "man"
    ];

    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

    // 1. Voice in target language explicitly containing a female keyword
    let found = langVoices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));

    // 2. Voice in target language that does NOT contain any male keyword
    if (!found) {
      found = langVoices.find(v => !maleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    }

    // 3. Any global voice across system containing female keyword
    if (!found) {
      found = voices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    }

    return found || null;
  };

  // Initialize welcome message when language or component loads
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        text: t("chat.welcome"),
        timestamp: new Date(),
      },
    ]);
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasNewMessage(false);
    }
  }, [isOpen, messages]);

  // Clean up speech synthesis when component unmounts or window closes
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Clean text for Text-to-Speech voice synthesis so it doesn't read out "**" asterisks
  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/[*_~`#]/g, "")
      .replace(/\n+/g, ". ")
      .trim();
  };

  // Helper to visually render formatted bold (**text**) and line breaks cleanly in UI
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={partIdx} className="font-semibold text-emerald-950 dark:text-emerald-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <span key={lineIdx} className="block mb-1.5 last:mb-0">
          {formattedLine}
        </span>
      );
    });
  };

  const speakText = (text: string, msgId?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // If already speaking this message, toggle off
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpoken = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanSpoken);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 1.0;
    utterance.pitch = 1.25; // Feminine pitch tuning

    const femaleVoice = getFemaleVoice(language, availableVoices);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => {
      if (msgId) setSpeakingMsgId(msgId);
    };

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t("chat.micUnsupported"));
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          sendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  };

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
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await apiRequest("POST", "/api/chat", {
        message: text.trim(),
        history,
        language,
      });
      const data = await res.json();

      const replyText = data.reply || data.error || (language === "hi" ? "क्षमा करें, मैं इसे प्रोसेस नहीं कर सका।" : "Sorry, I couldn't process that. Please try again.");

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: replyText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (!isOpen) setHasNewMessage(true);

      // Auto readout voice if enabled
      if (autoSpeech) {
        speakText(replyText, botMsg.id);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: language === "hi" ? "सॉरी, अभी कनेक्ट करने में समस्या हो रही है। कृपया थोड़ी देर बाद प्रयास करें।" : "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
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
    date.toLocaleTimeString(language === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" });

  const quickSuggestions = [
    t("chat.sug.1"),
    t("chat.sug.2"),
    t("chat.sug.3"),
    t("chat.sug.4"),
    t("chat.sug.5"),
    t("chat.sug.6"),
  ];

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
              className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-md whitespace-nowrap flex items-center gap-1.5"
            >
              <span>{t("chat.badge")}</span>
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
            className="fixed bottom-24 right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/60"
            style={{ maxHeight: "530px" }}
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
                <p className="text-white font-semibold text-sm leading-tight">{t("chat.title")}</p>
                <p className="text-emerald-100 text-[11px] truncate">{t("chat.subtitle")}</p>
              </div>

              {/* Audio Auto-Readout Toggle */}
              <button
                onClick={() => {
                  const nextState = !autoSpeech;
                  setAutoSpeech(nextState);
                  if (!nextState && typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    setSpeakingMsgId(null);
                  }
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors text-white",
                  autoSpeech ? "bg-white/20 hover:bg-white/30" : "bg-black/20 text-emerald-200 hover:text-white"
                )}
                title={autoSpeech ? t("chat.autoSpeechOn") : t("chat.autoSpeechOff")}
              >
                {autoSpeech ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-70" />}
              </button>

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
                  <div className={cn("max-w-[82%] flex flex-col gap-0.5", msg.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "px-3 py-2 rounded-2xl text-sm leading-relaxed relative group",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      )}
                    >
                      {renderFormattedText(msg.text)}
                      
                      {/* TTS Speak Icon for Bot Messages */}
                      {msg.role === "model" && (
                        <button
                          onClick={() => speakText(msg.text, msg.id)}
                          className={cn(
                            "ml-2 text-xs hover:opacity-100 opacity-60 inline-flex items-center gap-1 transition-opacity",
                            speakingMsgId === msg.id ? "text-emerald-500 opacity-100 font-medium" : "text-muted-foreground"
                          )}
                          title="Listen to this message"
                        >
                          {speakingMsgId === msg.id ? (
                            <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
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

            {/* Quick Suggestions */}
            {messages.length <= 2 && (
              <div className="bg-background/95 px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {quickSuggestions.slice(0, 3).map((s) => (
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

            {/* Voice Listening Status Bar */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-emerald-500 text-white px-3 py-1.5 text-xs flex items-center justify-between"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    {t("chat.listening")}
                  </span>
                  <button onClick={() => startVoiceInput()} className="underline text-[11px]">
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Bar */}
            <div className="bg-background border-t border-border px-3 py-2.5 flex gap-2 items-center">
              {/* Mic STT Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={startVoiceInput}
                disabled={isLoading}
                className={cn(
                  "h-9 w-9 rounded-xl shrink-0 transition-colors",
                  isListening ? "bg-red-500 text-white border-red-600 animate-pulse" : "hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950"
                )}
                title={isListening ? "Stop listening" : "Speak your message"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              </Button>

              <Input
                ref={inputRef}
                id="chatbot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? t("chat.listening") : t("chat.placeholder")}
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
