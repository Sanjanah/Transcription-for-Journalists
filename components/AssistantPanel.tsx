import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, MessageSquare, Quote, List, Bot } from 'lucide-react';
import { Button } from './Button';
import { createChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AssistantPanelProps {
  transcription: string;
}

const FormattedMessage = ({ text }: { text: string }) => {
  // Defensive cleanup: remove markdown symbols if the model accidentally includes them
  const cleanText = text
    .replace(/\*\*/g, '') // remove bold markers
    .replace(/__/g, '')   // remove italic markers
    .replace(/^#+\s*/gm, ''); // remove header markers

  return (
    <div className="prose prose-sm max-w-none text-journal-800">
      {cleanText.split('\n').map((line, i) => {
        const trimmed = line.trim();
        
        // Empty lines become spacing
        if (!trimmed) return <div key={i} className="h-3" />;
        
        // Detection for Headers (All Caps and short)
        // We ensure it has at least some letters and isn't just numbers/symbols
        if (
          trimmed.length < 60 && 
          trimmed.length > 3 && 
          trimmed === trimmed.toUpperCase() && 
          /[A-Z]/.test(trimmed) &&
          !trimmed.startsWith('-')
        ) {
          return (
            <h4 key={i} className="font-bold text-journal-900 mt-4 mb-2 text-xs tracking-wider border-b border-journal-100 pb-1">
              {trimmed}
            </h4>
          );
        }
        
        // List Item detection
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 ml-1 mb-1.5 items-start">
              <span className="text-journal-400 mt-1.5 w-1 h-1 rounded-full bg-journal-400 shrink-0"></span>
              <span className="leading-relaxed">{trimmed.substring(2)}</span>
            </div>
          );
        }
        
        // Numbered List detection (1. )
        if (/^\d+\.\s/.test(trimmed)) {
           const [num, ...rest] = trimmed.split(' ');
           return (
            <div key={i} className="flex gap-2 ml-1 mb-1.5 items-start">
              <span className="text-journal-500 font-medium shrink-0 w-5">{num}</span>
              <span className="leading-relaxed">{rest.join(' ')}</span>
            </div>
           );
        }

        // Standard Paragraph
        return <p key={i} className="mb-2 leading-relaxed">{trimmed}</p>;
      })}
    </div>
  );
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ transcription }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcription) {
      try {
        const session = createChatSession(transcription);
        setChatSession(session);
        setMessages([{
          role: 'model',
          text: "I've analyzed the transcript. I can help you summarize the content, find specific quotes, or answer questions about what was discussed."
        }]);
      } catch (error) {
        console.error("Failed to init chat", error);
        setMessages([{
          role: 'model',
          text: "Error initializing AI assistant. Please check your API key."
        }]);
      }
    }
  }, [transcription]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !chatSession || isLoading) return;

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatSession.sendMessage({ message: text });
      const modelMsg: Message = { role: 'model', text: response.text || "I couldn't generate a response." };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const QuickAction = ({ icon: Icon, label, prompt }: { icon: any, label: string, prompt: string }) => (
    <button
      onClick={() => handleSend(prompt)}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-2 bg-journal-50 hover:bg-journal-100 border border-journal-200 rounded-lg text-sm text-journal-700 transition-colors"
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-journal-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-journal-100 bg-journal-50 flex items-center gap-2 text-journal-900">
        <Sparkles size={16} className="text-journal-accent" />
        <span className="font-medium">AI Assistant</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-journal-100 flex items-center justify-center flex-shrink-0 text-journal-600 mt-1">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`max-w-[90%] rounded-2xl px-5 py-4 text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-journal-900 text-white rounded-tr-none'
                  : 'bg-white text-journal-800 rounded-tl-none border border-journal-100'
              }`}
            >
              {msg.role === 'model' ? (
                <FormattedMessage text={msg.text} />
              ) : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-journal-100 flex items-center justify-center flex-shrink-0 text-journal-600">
                <Bot size={16} />
              </div>
             <div className="bg-journal-50 px-4 py-3 rounded-2xl rounded-tl-none border border-journal-100 flex items-center">
                <Loader2 size={16} className="animate-spin text-journal-400" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions & Input */}
      <div className="p-4 bg-white border-t border-journal-100">
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <QuickAction icon={List} label="Summarize" prompt="Please provide a concise summary of this transcription." />
            <QuickAction icon={Quote} label="Key Quotes" prompt="Extract the most significant direct quotes from the speakers." />
            <QuickAction icon={MessageSquare} label="Main Topics" prompt="What are the main topics discussed in this recording?" />
          </div>
        )}
        
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the transcript..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-journal-50 border border-journal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-journal-900 focus:border-transparent placeholder-journal-400 text-sm"
          />
          <Button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || isLoading}
            size="md"
            className="rounded-xl px-3"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};