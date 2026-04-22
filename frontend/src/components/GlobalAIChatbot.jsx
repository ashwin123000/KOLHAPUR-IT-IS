import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageSquare, Send, X, Sparkles, User, Bot, Loader2,
  Zap, RotateCcw, AlertCircle
} from 'lucide-react';
import { chatAPI } from '../services/api';

const SESSION_KEY = 'ai_chat_history';

/**
 * GlobalAIChatbot — Premium context-aware AI Career Assistant.
 *
 * Features implemented:
 *  ✅ /pitch shortcut button — sends job context to backend
 *  ✅ Session persistence — chat survives page navigation (sessionStorage)
 *  ✅ Redis memory — sends user_id so backend saves history server-side
 *  ✅ Exponential backoff — 2s → 4s → 8s → 10s max on network failure
 *  ✅ Job context injection — reads lastJobContext from localStorage
 *  ✅ Fix #6: /pitch guard — shows helpful message if no job is open
 */
const GlobalAIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ── Init: restore chat from sessionStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([{
          role: 'assistant',
          content: "Hi! I'm your AI Career Guide 🚀\n\nOpen any job and type `/pitch` to get your personalized 30-second elevator pitch. Or just ask me anything career-related!"
        }]);
      }
    } catch {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm your AI Career Guide. Ask me anything! 🚀"
      }]);
    }
  }, []);

  // ── Persist messages to sessionStorage on every change ────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-20)));
      } catch { /* ignore storage-full errors */ }
    }
  }, [messages]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Focus input when opened ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // ── Exponential Backoff: 2s → 4s → 8s → max 10s ─────────────────────────
  const withBackoff = useCallback(async (fn, attempt = 0) => {
    try {
      return await fn();
    } catch (err) {
      const delays = [2000, 4000, 8000, 10000];
      if (attempt < delays.length) {
        await new Promise(r => setTimeout(r, delays[attempt]));
        return withBackoff(fn, attempt + 1);
      }
      throw err;
    }
  }, []);

  // ── Get current job context from localStorage ──────────────────────────────
  const getJobContext = () => {
    try {
      return JSON.parse(localStorage.getItem('lastJobContext') || '{}');
    } catch {
      return {};
    }
  };

  // ── Main send handler ───────────────────────────────────────────────────────
  const handleSend = async (overrideMessage = null) => {
    const userMessage = (overrideMessage || input).trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setError(null);

    const userId = localStorage.getItem('userId') || '';
    const jobContext = getJobContext();

    // Append user message immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Last 10 messages as history (aligns with Redis cap)
    const historySnapshot = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const res = await withBackoff(() =>
        chatAPI.sendMessage(userMessage, location.pathname, historySnapshot, userId, jobContext)
      );
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setError('Connection failed after retries.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ I couldn't connect after multiple retries. Please check your internet and try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── /pitch shortcut ─────────────────────────────────────────────────────────
  const handlePitch = () => handleSend('/pitch');

  // ── Clear history ───────────────────────────────────────────────────────────
  const clearHistory = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! Open a job and type `/pitch` for your personalized pitch, or ask me anything! 🎯"
    }]);
  };

  const jobContext = getJobContext();
  const hasJobContext = !!jobContext.job_id;
  const msgCount = messages.filter(m => m.role === 'user').length;

  const currentPage = location.pathname === '/'
    ? 'Home'
    : location.pathname.split('/').filter(Boolean).pop() || 'Page';

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Toggle Button ── */}
      {!isOpen && (
        <button
          id="ai-chatbot-toggle"
          onClick={() => setIsOpen(true)}
          style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #0f766e, #059669)',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(15,118,110,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(15,118,110,0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(15,118,110,0.45)';
          }}
        >
          <MessageSquare size={22} color="white" />
          {msgCount > 0 && (
            <div style={{
              position: 'absolute', top: -3, right: -3,
              width: 18, height: 18,
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid white',
              fontSize: 9,
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}>
              {Math.min(msgCount, 9)}
            </div>
          )}
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div style={{
          width: 400, height: 570,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(15,118,110,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #0d5c55 0%, #0f766e 50%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} color="rgba(255,255,255,0.9)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>AI Career Guide</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <div style={{
                    width: 6, height: 6,
                    background: isLoading ? '#fbbf24' : '#6ee7b7',
                    borderRadius: '50%',
                    animation: isLoading ? 'none' : 'pulse 2s infinite',
                  }} />
                  <span style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                    {isLoading ? 'Thinking...' : 'Online'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={clearHistory}
                title="Clear chat"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div style={{
            padding: '7px 14px',
            background: 'linear-gradient(90deg, #f0fdf9, #ecfdf5)',
            borderBottom: '1px solid #d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#065f46',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={11} color="#059669" />
              <span>Aware of <b style={{ textTransform: 'capitalize' }}>{currentPage}</b> context</span>
            </div>
            {hasJobContext && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#047857', fontWeight: 600 }}>
                <Zap size={11} />
                <span>/pitch ready</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#f8fafb',
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <div style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  background: msg.role === 'user'
                    ? '#e6f7f4'
                    : 'linear-gradient(135deg, #0f766e, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                }}>
                  {msg.role === 'user'
                    ? <User size={14} color="#0f766e" />
                    : <Bot size={14} color="white" />
                  }
                </div>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 13px',
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #0f766e, #059669)'
                    : 'white',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  boxShadow: msg.role === 'user'
                    ? '0 4px 12px rgba(15,118,110,0.25)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0f766e, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{
                  padding: '10px 14px',
                  background: 'white',
                  borderRadius: '4px 16px 16px 16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <Loader2 size={14} color="#0f766e" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 14px',
            background: 'white',
            borderTop: '1px solid #f1f5f9',
          }}>
            {/* /pitch quick action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button
                id="pitch-shortcut-btn"
                onClick={handlePitch}
                disabled={isLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: hasJobContext ? '1.5px solid #0f766e' : '1.5px solid #e2e8f0',
                  background: hasJobContext ? '#f0fdf9' : '#f8fafc',
                  color: hasJobContext ? '#0f766e' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
                title={hasJobContext
                  ? `Generate pitch for "${jobContext.job_title || 'this role'}"`
                  : 'Open a job first to use /pitch'}
              >
                <Zap size={11} />
                /pitch
              </button>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                {hasJobContext
                  ? `→ "${(jobContext.job_title || 'this role').slice(0, 28)}..."`
                  : '→ Open a job first'}
              </span>
            </div>

            {/* Input row */}
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                id="ai-chat-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask anything, or type /pitch..."
                style={{
                  width: '100%',
                  padding: '11px 46px 11px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 13,
                  outline: 'none',
                  background: '#f8fafc',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0f766e';
                  e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                id="chat-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32,
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, #0f766e, #059669)'
                    : '#e2e8f0',
                  border: 'none',
                  borderRadius: 8,
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                  boxShadow: input.trim() && !isLoading ? '0 4px 10px rgba(15,118,110,0.3)' : 'none',
                }}
              >
                <Send size={14} color={input.trim() && !isLoading ? 'white' : '#94a3b8'} />
              </button>
            </div>

            <p style={{ marginTop: 8, fontSize: 9, textAlign: 'center', color: '#cbd5e1', letterSpacing: '0.05em' }}>
              Memory persisted · Context-aware · Intelligence Core v2
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideIn {
          from { transform: translateY(16px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};

export default GlobalAIChatbot;
