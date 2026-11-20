import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const fallbackReply = "Sorry, I'm having trouble right now. Please try again in a moment.";

function isConciergeResponse(value: unknown): value is { reply: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const reply = (value as Record<string, unknown>).reply;
  return typeof reply === 'string' && reply.trim().length > 0 && reply.length <= 8000;
}

export function AIConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! 👋 I'm the DeGameTV concierge. Ask me about screenings, ticket prices, showtimes, or how things work!" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || text.length > 500) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-concierge', {
        body: {
          messages: newMessages.slice(1).slice(-20).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        },
      });

      const payload: unknown = data;
      if (error || !isConciergeResponse(payload)) {
        if (mountedRef.current) {
          setMessages((previous) => [
            ...previous,
            { role: 'assistant', content: fallbackReply },
          ]);
        }
      } else if (mountedRef.current) {
        setMessages((previous) => [
          ...previous,
          { role: 'assistant', content: payload.reply.trim() },
        ]);
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        console.error('AI concierge request failed:', error);
        setMessages((previous) => [
          ...previous,
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Open AI Concierge"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[340px] sm:w-[380px] max-h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">DeGameTV Concierge</p>
                <p className="text-[10px] opacity-80">AI-powered assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20 rounded-full p-1 transition-colors"
              aria-label="Close AI Concierge"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px] max-h-[350px]" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[75%] text-sm px-3 py-2 rounded-2xl leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-foreground rounded-bl-md'
                }`}>
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start" role="status" aria-label="Concierge is responding">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-secondary text-foreground px-3 py-2 rounded-2xl rounded-bl-md">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about screenings, prices..."
                className="rounded-full h-9 text-sm"
                maxLength={500}
                disabled={loading}
                aria-label="Message the concierge"
              />
              <Button
                size="icon"
                aria-label="Send message"
                className="rounded-full h-9 w-9 flex-shrink-0"
                onClick={() => { void sendMessage(); }}
                disabled={!input.trim() || loading}
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
