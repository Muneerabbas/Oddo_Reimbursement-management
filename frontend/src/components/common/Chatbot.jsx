import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import chatbotService from '../../services/chatbotService';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hi there! I'm your SQL-first Support Agent. Ask about billing disputes, reimbursement status, or approval workflow.",
      sender: 'bot',
      meta: { confidence: 0.99, queryTrace: [], suggestedActions: [], escalate: false, escalateReason: null },
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to the bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add user message to UI immediately
    const userMsg = { text: inputText.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await chatbotService.sendMessage(userMsg.text);
      if (response && response.reply) {
        setMessages(prev => [...prev, {
          text: response.reply,
          sender: 'bot',
          meta: {
            confidence: response.confidence,
            queryTrace: response.queryTrace || [],
            suggestedActions: response.suggestedActions || [],
            escalate: response.escalate,
            escalateReason: response.escalateReason,
          },
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        text: "I'm having trouble connecting right now. Please try again later.", 
        sender: 'bot', 
        isError: true 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Floating Chat Window */}
      <div 
        className={`pointer-events-auto transform transition-all duration-300 origin-bottom-right mb-4 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-2xl backdrop-blur-xl sm:w-96 w-[calc(100vw-3rem)]
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Expense Assistant</h3>
              <p className="text-xs text-primary-100">Usually responds instantly</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex h-96 flex-col overflow-y-auto p-4 scroll-smooth bg-slate-50/50">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`group relative flex max-w-[85%] items-end ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div 
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    msg.sender === 'user' ? 'bg-slate-200 text-slate-500 ml-2' : 'bg-primary/10 text-primary mr-2'
                  }`}
                >
                  {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                <div 
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    msg.sender === 'user' 
                      ? 'rounded-br-sm bg-primary text-white' 
                      : msg.isError 
                        ? 'rounded-bl-sm bg-red-50 text-red-600 border border-red-100'
                        : 'rounded-bl-sm bg-white text-slate-700 border border-slate-100'
                  }`}
                >
                  {msg.text}
                  {msg.sender === 'bot' && msg.meta && (
                    <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500 space-y-1">
                      {typeof msg.meta.confidence === 'number' && (
                        <div>Confidence: {Math.round(msg.meta.confidence * 100)}%</div>
                      )}
                      {Array.isArray(msg.meta.queryTrace) && msg.meta.queryTrace.length > 0 && (
                        <div>Trace: {msg.meta.queryTrace.map((q) => q.templateId).join(', ')}</div>
                      )}
                      {Array.isArray(msg.meta.suggestedActions) && msg.meta.suggestedActions.length > 0 && (
                        <div>Suggested: {msg.meta.suggestedActions.join(' ')}</div>
                      )}
                      {msg.meta.escalate && (
                        <div className="text-amber-600 font-semibold">
                          Escalate: {msg.meta.escalateReason || 'Human review recommended.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="mb-4 flex justify-start">
               <div className="flex items-end flex-row">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mr-2">
                    <Bot size={14} />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm border border-slate-100">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form 
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-all hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
      </div>

      {/* Floating Action Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/30"
        aria-label="Toggle chat"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
      
    </div>
  );
};

export default Chatbot;
