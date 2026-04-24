import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Send, RotateCcw, Loader } from 'lucide-react';

/**
 * Career Intelligence Chatbot Widget
 * Appears as floating chat on job detail pages
 * Connects to /api/chat backend endpoint
 */
const CareerChatWidget = ({ jobId, jobTitle, matchScore, onMatchScoreUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage('hello');
    }
  }, [isOpen]);

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const newMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/chat',
        {
          message: messageText,
          jobId: jobId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const { 
        reply, 
        intent, 
        intentLabel, 
        intentEmoji, 
        matchScore: newScore,
        confidence 
      } = response.data;

      const botMessage = {
        role: 'assistant',
        content: reply,
        intent: intent,
        intentLabel: intentLabel,
        intentEmoji: intentEmoji,
        matchScore: newScore,
        confidence: confidence
      };

      setMessages(prev => [...prev, botMessage]);

      // Update parent score if it changed
      if (newScore && onMatchScoreUpdate) {
        onMatchScoreUpdate(newScore);
      }
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete('/api/chat/clear', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
    } catch (err) {
      setError('Failed to clear history');
    }
  };

  const handleQuickAction = (phrase) => {
    sendMessage(phrase);
  };

  const renderMessage = (msg, index) => {
    const isBot = msg.role === 'assistant';

    // Parse message content with formatting
    let content = msg.content;
    const lines = content.split('\n');

    return (
      <div
        key={index}
        className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}
      >
        <div
          className={`max-w-[85%] p-3 rounded-lg ${
            isBot
              ? 'bg-white border border-gray-200 text-gray-800'
              : 'bg-blue-600 text-white'
          }`}
        >
          {isBot ? (
            <div className="space-y-1 text-sm leading-relaxed">
              {lines.map((line, i) => {
                // Render bullet points
                if (line.trim().startsWith('•')) {
                  return (
                    <div key={i} className="flex gap-2 ml-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{line.replace('•', '').trim()}</span>
                    </div>
                  );
                }
                // Render numbered lists
                if (/^\d+\./.test(line.trim())) {
                  return (
                    <div key={i} className="ml-3">
                      {line}
                    </div>
                  );
                }
                // Render section headers (bold text followed by colon)
                if (line.includes(':') && line.split(':')[0].length < 40) {
                  const colonIdx = line.indexOf(':');
                  const header = line.substring(0, colonIdx);
                  const rest = line.substring(colonIdx + 1);
                  return (
                    <div key={i} className="font-semibold mt-2 mb-1">
                      {header}:{rest && <span className="font-normal">{rest}</span>}
                    </div>
                  );
                }
                // Render empty lines as spacers
                if (!line.trim()) {
                  return <div key={i} className="h-1" />;
                }
                // Render regular lines
                return line && <div key={i}>{line}</div>;
              })}

              {/* Intent Badge */}
              {msg.intent && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {msg.intentEmoji} {msg.intentLabel}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm whitespace-pre-wrap">{content}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans">
      {/* Chat Widget */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 h-[550px] flex flex-col mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base">Career Coach</h3>
              {jobTitle && matchScore !== undefined && (
                <p className="text-xs text-blue-100 mt-1">
                  {jobTitle} • <span className="font-semibold">{matchScore}%</span> match
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={clearHistory}
                className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
                title="Clear history"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8 px-4">
                <p className="mb-3 text-lg">👋 Welcome!</p>
                <p className="leading-relaxed">I'm your AI career coach. Ask me about:</p>
                <p className="text-xs mt-2 text-gray-400">• Your match score • Project ideas • Interview prep • Skill roadmaps</p>
              </div>
            ) : (
              messages.map((msg, i) => renderMessage(msg, i))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-2">
                  <Loader size={16} className="animate-spin text-blue-600" />
                  <span className="text-xs text-gray-600">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (show only if no messages yet) */}
          {messages.length === 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Quick actions:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '📈 Score', phrase: 'How can I improve my match score?' },
                  { label: '🛠️ Project', phrase: 'What project should I build?' },
                  { label: '🎯 Interview', phrase: 'How do I prepare for interviews?' },
                  { label: '🗺️ Roadmap', phrase: 'What\'s my roadmap to this role?' }
                ].map(({ label, phrase }) => (
                  <button
                    key={phrase}
                    onClick={() => handleQuickAction(phrase)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 transition-colors font-medium"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-600 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-gray-200 bg-white rounded-b-xl flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
              placeholder="Ask anything..."
              className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Float Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg transition-all flex items-center justify-center text-white font-bold text-2xl hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-gray-500 hover:bg-gray-600'
            : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
        }`}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={24} /> : '💬'}
      </button>
    </div>
  );
};

export default CareerChatWidget;
