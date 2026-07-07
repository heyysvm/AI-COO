import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Bot, Brain, VolumeX, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import PageWrapper from "@/components/shared/PageWrapper";
import api from "@/services/api";

type AgentState = "idle" | "listening" | "thinking" | "speaking";

export const VoiceAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [transcript, setTranscript] = useState("");
  const [cooReply, setCooReply] = useState("");
  const [speakingText, setSpeakingText] = useState("");

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimeoutRef = useRef<any>(null);

  const isActiveRef = useRef(isActive);
  const agentStateRef = useRef(agentState);

  // Keep refs synchronized with state to prevent event listeners from triggering dependency restarts
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  // Pre-load speech synthesis voices on mount to prevent asynchronous delay in Chrome
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Initialize Speech Recognition ONCE or when language changes
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang === "en" ? "en-IN" : "hi-IN";
      
      rec.onstart = () => {
        setAgentState("listening");
      };

      rec.onresult = (event: any) => {
        // Clear silence detection on active speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          setTranscript(currentText);
          
          // Trigger silence timer (1.5 seconds of silence = send message)
          silenceTimeoutRef.current = setTimeout(() => {
            handleVoiceSubmit(currentText);
          }, 1500);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        if (e.error !== "no-speech") {
          setIsActive(false);
          setAgentState("idle");
          isActiveRef.current = false;
          agentStateRef.current = "idle";
        }
      };

      rec.onend = () => {
        // Automatically restart listening if session is still active and listening state
        if (isActiveRef.current && agentStateRef.current === "listening") {
          try {
            rec.start();
          } catch (err) {
            console.error("Failed to restart Speech Recognition:", err);
          }
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    };
  }, [lang]);

  const stopAllVoiceActions = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const startVoiceSession = () => {
    stopAllVoiceActions();
    setIsActive(true);
    setTranscript("Listening for your voice... speak now");
    setCooReply("");
    setSpeakingText("");
    setAgentState("listening");

    // Let state update apply to refs first
    isActiveRef.current = true;
    agentStateRef.current = "listening";

    if (!recognitionRef.current) {
      toast.error("Speech Recognition is not supported in this browser. Please use Chrome.");
      setIsActive(false);
      setAgentState("idle");
      return;
    }

    try {
      recognitionRef.current.start();
      toast.success("Voice Session Started! Talk freely.");
    } catch (err) {
      console.error("Failed to start voice recognition session:", err);
    }
  };

  const stopVoiceSession = () => {
    setIsActive(false);
    setAgentState("idle");
    isActiveRef.current = false;
    agentStateRef.current = "idle";
    stopAllVoiceActions();
    toast.success("Voice Session Ended.");
  };

  // Submit voice input to agent chat pipeline
  const handleVoiceSubmit = async (queryText: string) => {
    if (!queryText.trim() || agentState === "thinking" || agentState === "speaking") return;

    // Set state to thinking first to prevent onend from restarting recognition
    setAgentState("thinking");
    agentStateRef.current = "thinking";

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    // Pause listener during API fetch and playback
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    setTranscript(queryText);

    try {
      // 1. Get LLM response (connected to live MongoDB stats)
      const chatRes = await api.post("/chat/", { message: queryText });
      const replyText = chatRes.data.response;
      const spokenSummary = chatRes.data.voice_summary || replyText;
      
      setCooReply(replyText); // Detailed report displays in the UI card
      setSpeakingText(spokenSummary); // Spoken summary displays in subtitles and is played out loud

      // 2. Play reply using Voice (Murf API or local fallback)
      setAgentState("speaking");
      playCooVoice(spokenSummary);

    } catch (err: any) {
      console.error(err);
      toast.error("Voice Agent request failed.");
      setAgentState("listening");
      // Resume listening
      if (isActive && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }
  };

  // Speak AI reply
  const playCooVoice = async (text: string) => {
    // Call backend TTS route for Murf synthesis
    try {
      const voiceId = lang === "en" ? "en-IN-winnie" : "hi-IN-kalpana";
      const res = await api.post("/chat/tts", { text, voice_id: voiceId });

      if (res.data.status === "success" && res.data.audioUrl) {
        // Play Murf Audio URL
        const audio = new Audio(res.data.audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          resumeListening();
        };
        audio.onerror = () => {
          fallbackToBrowserSpeech(text);
        };

        audio.play().catch((err) => {
          console.warn("Murf audio playback blocked by browser, falling back to local speech synthesis.", err);
          fallbackToBrowserSpeech(text);
        });
      } else {
        // Fallback to browser speech
        fallbackToBrowserSpeech(text);
      }
    } catch (err) {
      console.error("Murf TTS error, falling back to local speech synthesis:", err);
      fallbackToBrowserSpeech(text);
    }
  };

  const fallbackToBrowserSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      // Clean markdown out
      const cleanText = text
        .replace(/[\#\*\_`\-]/g, "")
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === "en" ? "en-IN" : "hi-IN";
      utterance.volume = 1.0;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      console.log("VoiceAgent available voices:", voices.map(v => `${v.name} (${v.lang})`));
      
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
        if (!voice) voice = voices.find((v) => v.lang.startsWith("en"));
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
        console.log("VoiceAgent selected voice:", voice.name, voice.lang);
        utterance.voice = voice;
      }

      // Safety timeout to prevent getting stuck if browser voice synthesis fails to fire onend
      const wordCount = cleanText.split(/\s+/).length;
      const estimatedSeconds = Math.max(4, Math.min(12, Math.ceil(wordCount * 0.4))); // 400ms per word + buffer
      let hasStartedSpeech = false;
      
      const safetyTimeout = setTimeout(() => {
        console.warn("Safety timeout triggered: speech synthesis took too long.");
        resumeListening();
      }, estimatedSeconds * 1000);

      const startTimeout = setTimeout(() => {
        if (!hasStartedSpeech) {
          console.warn("Autoplay block detected: Speech synthesis was queued but failed to start speaking.");
          clearTimeout(safetyTimeout);
          try {
            window.speechSynthesis.cancel();
          } catch (e) {}
          resumeListening();
        }
      }, 800);

      utterance.onstart = () => {
        hasStartedSpeech = true;
        clearTimeout(startTimeout);
      };

      utterance.onend = () => {
        clearTimeout(safetyTimeout);
        clearTimeout(startTimeout);
        resumeListening();
      };
      
      utterance.onerror = (e) => {
        console.error("Speech synthesis error event:", e);
        clearTimeout(safetyTimeout);
        clearTimeout(startTimeout);
        resumeListening();
      };

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Speech synthesis execution failed", err);
        clearTimeout(safetyTimeout);
        clearTimeout(startTimeout);
        resumeListening();
      }
    } else {
      resumeListening();
    }
  };

  const resumeListening = () => {
    setSpeakingText("");
    if (isActiveRef.current) {
      setTranscript("Listening...");
      setAgentState("listening");
      agentStateRef.current = "listening";
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col h-[82vh] bg-surface/30 border border-border rounded-2xl overflow-hidden backdrop-blur-xl relative">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                AI COO Talk Agent
              </h2>
              <p className="text-[10px] text-text-secondary leading-none mt-0.5">
                Hands-free real-time voice discussions with your store metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLang((prev) => (prev === "en" ? "hi" : "en"))}
              className="text-[9px] font-bold bg-surface/50 hover:bg-surface-hover text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg border border-border transition-all cursor-pointer"
            >
              {lang === "en" ? "🇮🇳 English Accent" : "🇮🇳 हिन्दी Voice"}
            </button>
          </div>
        </div>

        {/* Voice Dashboard Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {/* Pulsing Visual Orb */}
          <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
            {/* Outer Waves */}
            <AnimatePresence>
              {isActive && agentState === "listening" && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-emerald-500/5 border border-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: "easeOut" }}
                  />
                </>
              )}

              {isActive && agentState === "speaking" && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent/15 border border-accent/20 shadow-[0_0_35px_rgba(99,102,241,0.4)]"
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent/5 border border-accent/10 shadow-[0_0_45px_rgba(99,102,241,0.2)]"
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
                  />
                </>
              )}

              {isActive && agentState === "thinking" && (
                <motion.div
                  className="absolute -inset-2 rounded-full border border-dashed border-accent/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              )}
            </AnimatePresence>

            {/* Core Orb Button */}
            <button
              onClick={isActive ? stopVoiceSession : startVoiceSession}
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border transition-all duration-500 cursor-pointer shadow-xl relative z-10 ${
                !isActive
                  ? "bg-surface/60 hover:bg-surface border-border hover:border-text-muted text-text-secondary"
                  : agentState === "listening"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                  : agentState === "thinking"
                  ? "bg-accent/10 border-accent/40 text-accent"
                  : "bg-accent/15 border-accent/50 text-accent-hover"
              }`}
            >
              {!isActive ? (
                <>
                  <Mic className="w-10 h-10 mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Start Call</span>
                </>
              ) : agentState === "listening" ? (
                <>
                  <Mic className="w-10 h-10 mb-2 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Listening</span>
                </>
              ) : agentState === "thinking" ? (
                <>
                  <Brain className="w-10 h-10 mb-2 animate-spin animate-duration-3000" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Thinking</span>
                </>
              ) : (
                <>
                  {/* Soundwave Equalizer Loader */}
                  <div className="flex items-center gap-1.5 justify-center h-8 mb-2">
                    <span className="w-1 h-6 bg-accent rounded-full animate-wave-bar-1 origin-bottom" />
                    <span className="w-1 h-8 bg-accent rounded-full animate-wave-bar-2 origin-bottom" />
                    <span className="w-1 h-4 bg-accent rounded-full animate-wave-bar-3 origin-bottom" />
                    <span className="w-1 h-8 bg-accent rounded-full animate-wave-bar-4 origin-bottom" />
                    <span className="w-1 h-5 bg-accent rounded-full animate-wave-bar-5 origin-bottom" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider animate-pulse">Speaking</span>
                </>
              )}
            </button>
          </div>

          {/* Subtitle / Live Transcript display */}
          <div className="max-w-md mx-auto min-h-[50px] mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Voice Transcript</h3>
            <p className={`text-sm leading-relaxed font-medium transition-all ${isActive ? "text-text-primary" : "text-text-muted"}`}>
              {isActive ? transcript || "Say something..." : "Start the voice session and discuss your store database hands-free."}
            </p>
          </div>

          {/* AI COO Response Subtitle display */}
          {cooReply && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl w-full flex flex-col gap-3 text-left z-20"
            >
              {/* Spoken subtitle box */}
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl shadow-sm backdrop-blur-md">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-accent mb-1 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 animate-pulse" /> Live Speech Summary
                </h4>
                <p className="text-xs text-text-primary leading-relaxed font-semibold italic">
                  "{speakingText || "..."}"
                </p>
              </div>

              {/* Full detailed breakdown */}
              <div className="p-4 bg-surface/50 border border-border rounded-2xl shadow-sm max-h-[170px] overflow-y-auto custom-scrollbar">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-2 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Detailed Analysis Report
                </h4>
                <div className="text-[11px] leading-relaxed text-text-primary prose prose-invert max-w-none">
                  <ReactMarkdown>{cooReply}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-border bg-[#12121a]/5 flex justify-between items-center text-xs">
          <span className="text-text-muted flex items-center gap-1">
            <Brain className="w-3.5 h-3.5 text-accent" /> Mode: Database-Connected Voice Assistant
          </span>
          {isActive && (
            <button
              onClick={stopVoiceSession}
              className="flex items-center gap-1 text-danger hover:text-danger/80 bg-danger/10 hover:bg-danger/20 border border-danger/15 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
            >
              <VolumeX className="w-3.5 h-3.5" /> Stop Session
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};
