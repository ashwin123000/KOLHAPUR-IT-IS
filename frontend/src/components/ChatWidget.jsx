import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { messagesAPI } from '../services/api';

/**
 * ChatWidget — Lightweight pseudo-real-time chat for a project.
 * Props: projectId (string), currentUserId (string)
 */
const ChatWidget = ({ projectId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef(null);

  // Poll every 5 seconds
  useEffect(() => {
    if (!projectId) return;
    const fetch = () => {
      messagesAPI.getByProject(projectId)
        .then(res => setMessages(res.data?.data || []))
        .catch(() => {});
    };
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => clearInterval(iv);
  }, [projectId]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async () => {
    if (!text.trim() || !projectId || !currentUserId) return;
    setSending(true);
    try {
      await messagesAPI.send({ projectId, senderId: currentUserId, receiverId: '', message: text.trim() });
      setText('');
      // Immediately fetch
      const res = await messagesAPI.getByProject(projectId);
      setMessages(res.data?.data || []);
    } catch (_) {}
    finally { setSending(false); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return ts; }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"
        >
          <MessageSquare size={22} />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-white" />
              <span className="text-white font-semibold text-sm">Project Chat</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72 bg-slate-50">
            {messages.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-6">No messages yet. Start the conversation!</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}>
                    {!isMe && (
                      <p className="text-[10px] font-bold text-blue-500 mb-0.5">{msg.senderName || 'User'}</p>
                    )}
                    <p className="leading-relaxed">{msg.message}</p>
                    <p className={`text-[10px] mt-0.5 ${isMe ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <input
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="w-9 h-9 flex items-center justify-center bg-blue-600 rounded-lg text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
