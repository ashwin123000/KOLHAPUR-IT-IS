import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, Briefcase, Loader2, RotateCcw, Send, Sparkles, User, X } from "lucide-react";

import { chatAPI } from "../services/api";

const HISTORY_LIMIT = 16;

function buildStarterMessage(jobTitle) {
  if (jobTitle) {
    return (
      "Tell me this in one line:\n\n" +
      "Target role + your current skills + experience + what’s going wrong\n\n" +
      `Example: ${jobTitle} + Python, FastAPI, PostgreSQL + 1 year + getting rejected after interviews`
    );
  }
  return (
    "Tell me this in one line:\n\n" +
    "Target role + your current skills + experience + what’s going wrong\n\n" +
    "Example: Backend engineer + Python, FastAPI, PostgreSQL + 1 year + getting rejected after interviews"
  );
}

export default function AriaChatbot({
  storageKey,
  title = "ARIA",
  subtitle = "Career Intelligence Assistant",
  variant = "global",
  jobId = null,
  jobTitle = "",
}) {
  const location = useLocation();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(variant === "job");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        setMessages(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore broken session data
    }
    setMessages([{ role: "assistant", content: buildStarterMessage(jobTitle) }]);
  }, [jobTitle, storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-HISTORY_LIMIT)));
    } catch {
      // ignore storage issues
    }
  }, [messages, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const context = useMemo(
    () => ({
      job_id: jobId,
      job_title: jobTitle,
      page: location.pathname,
      mode: variant,
    }),
    [jobId, jobTitle, location.pathname, variant]
  );

  const quickPrompts = useMemo(() => {
    if (jobTitle) {
      return [
        `Why would I get rejected for ${jobTitle}?`,
        `What projects should I build for ${jobTitle}?`,
        `/mock ${jobTitle}`,
      ];
    }
    return [
      "Backend engineer + Python, FastAPI, PostgreSQL + 1 year + getting rejected after interviews",
      "Data scientist + Python, SQL + beginner + what am I missing?",
      "/mock backend engineer",
    ];
  }, [jobTitle]);

  const sendMessage = async (overrideText = "") => {
    const content = (overrideText || input).trim();
    if (!content || loading) {
      return;
    }

    const nextUserMessage = { role: "user", content };
    const history = messages.slice(-8).map((message) => ({ role: message.role, content: message.content }));

    setMessages((current) => [...current, nextUserMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await chatAPI.sendMessage(content, location.pathname, history, localStorage.getItem("userId") || "", context);
      const reply = response.data?.reply || "I couldn't produce a useful answer. Try being more specific.";
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.reply || err.message || "Failed to reach ARIA.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I couldn't complete that request. Try sending your target role + current skills + experience + what’s going wrong in one line.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      await chatAPI.clearHistory();
    } catch {
      // keep local clear even if backend clear fails
    }
    sessionStorage.removeItem(storageKey);
    setMessages([{ role: "assistant", content: buildStarterMessage(jobTitle) }]);
    setError("");
  };

  const shellClass =
    variant === "job"
      ? "w-full max-w-md rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.12)]"
      : "w-[390px] rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.18)]";

  const widget = (
    <div className={`${shellClass} overflow-hidden`}>
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_35%),linear-gradient(135deg,#052e2b,#0f766e_55%,#10b981)] px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-100/85">{title}</div>
              <h3 className="mt-1 text-lg font-black">{subtitle}</h3>
              <p className="mt-1 text-xs text-emerald-50/80">
                {jobTitle ? `Focused on ${jobTitle}` : "Diagnose the gap. Prioritize the fix. Build proof."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearConversation}
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Clear chat"
            >
              <RotateCcw size={16} />
            </button>
            {variant === "global" ? (
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                title="Close chat"
              >
                <X size={17} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              {prompt.length > 42 ? `${prompt.slice(0, 42)}...` : prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[430px] min-h-[360px] overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div key={`${message.role}-${index}`} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                    isUser ? "bg-slate-200 text-slate-700" : "bg-emerald-500 text-white"
                  }`}
                >
                  {isUser ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[13px] leading-6 ${
                    isUser
                      ? "rounded-tr-md bg-slate-900 text-white"
                      : "rounded-tl-md border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {loading ? (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Bot size={15} />
              </div>
              <div className="flex items-center gap-2 rounded-3xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                Diagnosing...
              </div>
            </div>
          ) : null}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-4">
        {error ? <p className="mb-2 text-xs font-medium text-rose-600">{error}</p> : null}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-emerald-400">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder="Target role + current skills + experience + what’s going wrong"
              className="max-h-32 min-h-[48px] w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Send size={17} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Briefcase size={12} />
            {jobTitle ? "Job-aware mode" : "General career mode"}
          </span>
          <span>Use `/mock role-name` for interview mode</span>
        </div>
      </div>
    </div>
  );

  if (variant === "job") {
    return <div className="fixed bottom-4 right-4 z-40">{widget}</div>;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isOpen ? (
        widget
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f766e,#10b981)] text-white shadow-[0_18px_50px_rgba(16,185,129,0.35)] transition hover:scale-105"
          aria-label="Open ARIA chatbot"
        >
          <Sparkles size={20} />
        </button>
      )}
    </div>
  );
}
