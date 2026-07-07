import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Loader2,
  ArrowRight,
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";

import PageWrapper from "@/components/shared/PageWrapper";
import api from "@/services/api";

const SUGGESTED_PROMPTS = [
  "How's my business doing?",
  "Which products need restocking?",
  "Analyze my expenses this month",
  "Show me my top customer spenders",
  "What are the latest retail market trends?",
];

export const AIChat: React.FC = () => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang === "en" ? "en-IN" : "hi-IN";
      
      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setMessage((prev) => (prev + " " + finalTranscript).trim());
        }
      };
      
      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success(`Listening in ${lang === "en" ? "English (India)" : "Hindi"}... Speak now!`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSpeak = (text: string, idx: number) => {
    if ("speechSynthesis" in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (speakingMessageId === idx) {
          setSpeakingMessageId(null);
          return;
        }
      }

      const cleanText = text
        .replace(/[\#\*\_`\-]/g, "")
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .trim();
        
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const voices = window.speechSynthesis.getVoices();
      console.log("SpeechSynthesis available voices:", voices.map(v => `${v.name} (${v.lang})`));
      
      let voice = null;
      if (lang === "en") {
        voice = voices.find(
          (v) =>
            v.lang === "en-IN" ||
            v.lang.startsWith("en_IN") ||
            v.name.toLowerCase().includes("india") ||
            v.name.toLowerCase().includes("heera") ||
            v.name.toLowerCase().includes("ravi") ||
            v.name.toLowerCase().includes("rishi") ||
            v.name.toLowerCase().includes("veena") ||
            v.name.toLowerCase().includes("hemant")
        );
        if (!voice) {
          voice = voices.find((v) => v.lang.startsWith("en"));
        }
      } else {
        voice = voices.find(
          (v) =>
            v.lang === "hi-IN" ||
            v.lang.startsWith("hi_IN") ||
            v.name.toLowerCase().includes("hindi") ||
            v.name.toLowerCase().includes("हिन्दी")
        );
      }
      
      if (voice) {
        console.log("Selected voice for speech:", voice.name, voice.lang);
        utterance.voice = voice;
      }
      
      utterance.onend = () => {
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
      };
      
      setSpeakingMessageId(idx);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech is not supported in this browser.");
    }
  };

  const { data: dbHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      const res = await api.get("/chat/history");
      return res.data;
    },
  });

  useEffect(() => {
    if (dbHistory.length > 0) {
      setChatHistory(dbHistory);
    }
  }, [dbHistory]);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, activeAgent]);

  const sendChatMutation = useMutation({
    mutationFn: async (payload: { message: string }) => {
      setLoading(true);
      const res = await api.post("/chat/", payload);
      return res.data;
    },
    onSuccess: (data) => {

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          agent: data.agent,
          confidence: data.confidence,
          timestamp: new Date(),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Chat request failed.");
    },
    onSettled: () => {
      setLoading(false);
      setActiveAgent(null);
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/chat/history");
    },
    onSuccess: () => {
      setChatHistory([]);
      toast.success("Chat history cleared!");
    },
    onError: () => {
      toast.error("Failed to clear chat history.");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const queryText = message.trim();
    setMessage("");

    const msg = queryText.toLowerCase();
    if (msg.includes("stock") || msg.includes("inventory") || msg.includes("reorder") || msg.includes("replenish")) {
      setActiveAgent("Inventory Agent");
    } else if (msg.includes("finance") || msg.includes("revenue") || msg.includes("expense") || msg.includes("margin")) {
      setActiveAgent("Finance Agent");
    } else if (msg.includes("market") || msg.includes("trends") || msg.includes("news") || msg.includes("search")) {
      setActiveAgent("Search Agent");
    } else if (msg.includes("customer") || msg.includes("segment") || msg.includes("vip") || msg.includes("spender")) {
      setActiveAgent("CRM Agent");
    } else {
      setActiveAgent("Supervisor Agent");
    }

    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: queryText, timestamp: new Date() },
    ]);

    sendChatMutation.mutate({ message: queryText });
  };

  const handleSelectPrompt = (promptText: string) => {
    if (loading) return;

    const msg = promptText.toLowerCase();
    if (msg.includes("stock") || msg.includes("inventory") || msg.includes("reorder") || msg.includes("replenish")) {
      setActiveAgent("Inventory Agent");
    } else if (msg.includes("finance") || msg.includes("revenue") || msg.includes("expense") || msg.includes("margin")) {
      setActiveAgent("Finance Agent");
    } else if (msg.includes("market") || msg.includes("trends") || msg.includes("news") || msg.includes("search")) {
      setActiveAgent("Search Agent");
    } else if (msg.includes("customer") || msg.includes("segment") || msg.includes("vip") || msg.includes("spender")) {
      setActiveAgent("CRM Agent");
    } else {
      setActiveAgent("Supervisor Agent");
    }

    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: promptText, timestamp: new Date() },
    ]);

    sendChatMutation.mutate({ message: promptText });
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the conversation log?")) {
      clearChatMutation.mutate();
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col h-[82vh] bg-surface/30 border border-border rounded-2xl overflow-hidden backdrop-blur-xl">
        {/* Chat Title Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                AI COO Multi-Agent Workspace
              </h2>
              <p className="text-[10px] text-text-secondary leading-none mt-0.5">
                Hierarchical CrewAI network running Gemini with fallback support
              </p>
            </div>
          </div>
          
          {chatHistory.length > 0 && (
            <button
              onClick={handleClear}
              className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-danger/10 transition-all cursor-pointer"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : chatHistory.length === 0 ? (
            /* Empty State: Prompt suggestions */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 glow-accent">
                <Brain className="w-6 h-6 text-accent animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                Interact with your AI COO
              </h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Our multi-agent system runs analytics over your products, sales, expense ledger, and VIP buyers to deliver operational intelligence. Select a suggestion below:
              </p>
              
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2 mt-6 w-full"
              >
                {SUGGESTED_PROMPTS.map((promptText, idx) => (
                  <motion.button
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 }
                    }}
                    key={idx}
                    onClick={() => handleSelectPrompt(promptText)}
                    className="p-3 bg-surface/50 hover:bg-surface-hover border border-border hover:border-border-hover rounded-xl text-left text-xs text-text-secondary hover:text-text-primary flex justify-between items-center transition-all cursor-pointer hover:translate-x-1 shadow-sm"
                  >
                    <span>{promptText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-all" />
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            /* Dialogue Thread */
            <div className="space-y-4">
              {chatHistory.map((chat, idx) => {
                const isUser = chat.role === "user";
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 150, damping: 18 }}
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border text-xs shrink-0 ${
                          isUser
                            ? "bg-accent/10 border-accent/20 text-accent"
                            : "bg-surface border-white/10 text-text-primary"
                        }`}
                      >
                        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      {/* Content Bubble */}
                      <div className="flex flex-col gap-1 w-full">
                        {/* Agent / Metadata header */}
                        {!isUser && (
                          <div className="flex items-center justify-between gap-2 mb-0.5 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              {chat.agent && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded">
                                  {chat.agent}
                                </span>
                              )}
                              {chat.confidence && (
                                <span className="text-[9px] text-text-muted">
                                  Confidence: {chat.confidence}
                                </span>
                              )}
                            </div>
                            {/* Speaker button */}
                            <button
                              onClick={() => handleSpeak(chat.content, idx)}
                              type="button"
                              className="text-text-secondary hover:text-accent p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                              title={speakingMessageId === idx ? "Stop speaking" : "Speak text"}
                            >
                              {speakingMessageId === idx ? (
                                <VolumeX className="w-3.5 h-3.5 text-accent animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        <div
                          className={`p-3.5 rounded-xl border text-xs leading-relaxed text-text-primary ${
                            isUser
                              ? "bg-accent/15 border-accent/20 rounded-tr-none"
                              : "bg-surface/50 backdrop-blur-md border-white/5 rounded-tl-none prose prose-invert max-w-none"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{chat.content}</p>
                          ) : (
                            <ReactMarkdown>{chat.content}</ReactMarkdown>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Dynamic Agent Processing indicator */}
              {loading && activeAgent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[85%] flex-row">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border text-xs shrink-0 bg-surface border-white/10 text-text-primary">
                      <Bot className="w-3.5 h-3.5 text-accent animate-pulse" />
                    </div>
                    
                    {/* Bubble with Bouncing Dots */}
                    <div className="flex flex-col gap-1 w-full">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded w-max animate-pulse">
                        {activeAgent} Reasoning
                      </span>
                      
                      <div className="p-4 rounded-xl border bg-surface/50 backdrop-blur-md border-white/5 rounded-tl-none flex items-center gap-1.5 min-w-[70px] w-max">
                        <span className="w-2 h-2 bg-accent rounded-full dot-bounce-1" />
                        <span className="w-2 h-2 bg-accent rounded-full dot-bounce-2" />
                        <span className="w-2 h-2 bg-accent rounded-full dot-bounce-3" />
                      </div>
                      <p className="text-[9px] text-text-muted italic px-1 animate-pulse">
                        Scanning MongoDB collections and executing tools...
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border bg-surface/25 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask your AI COO anything (e.g. 'How is my revenue doing?')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              className="w-full bg-background/60 border border-border focus:border-accent/40 text-xs text-text-primary py-3 pl-4 pr-24 rounded-xl outline-none transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === "en" ? "hi" : "en"))}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-[9px] font-bold bg-surface/50 hover:bg-surface-hover text-text-secondary hover:text-text-primary px-2 py-1 rounded border border-border transition-all cursor-pointer"
              title="Toggle Accent/Language (English-IN / Hindi)"
            >
              {lang === "en" ? "EN-IN" : "HI-IN"}
            </button>
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg cursor-pointer transition-all ${
                isListening
                  ? "bg-danger/20 text-danger hover:bg-danger/30 animate-pulse animate-duration-1000"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
              title={isListening ? "Stop listening" : "Talk with your voice"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="bg-accent hover:bg-accent-hover text-white p-3 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </PageWrapper>
  );
};
