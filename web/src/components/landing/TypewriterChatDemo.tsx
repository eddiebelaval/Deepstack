'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Brain, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  icon?: React.ReactNode;
  highlight?: 'warning' | 'insight' | 'success';
}

const DEMO_CONVERSATION: ChatMessage[] = [
  {
    id: 1,
    type: 'user',
    content: "I'm thinking of going long on NVDA. It's down 8% this week.",
  },
  {
    id: 2,
    type: 'assistant',
    content: "I notice you've mentioned 'buying the dip' on NVDA three times this month after red days. Let me check if this aligns with your thesis...",
    icon: <Brain className="w-4 h-4" />,
    highlight: 'warning',
  },
  {
    id: 3,
    type: 'assistant',
    content: "Your original thesis was about AI infrastructure growth, not short-term price action. Are you sure this isn't FOMO from watching the pullback?",
    icon: <AlertTriangle className="w-4 h-4" />,
    highlight: 'warning',
  },
  {
    id: 4,
    type: 'user',
    content: "Fair point. What do prediction markets say about AI chip demand?",
  },
  {
    id: 5,
    type: 'assistant',
    content: "Polymarket shows 73% probability for continued datacenter GPU shortage through Q2. Kalshi has 'AI infrastructure spend increase' at 81%. Your thesis aligns with market consensus.",
    icon: <TrendingUp className="w-4 h-4" />,
    highlight: 'insight',
  },
  {
    id: 6,
    type: 'assistant',
    content: "Recommendation: If you want to add, consider dollar-cost averaging rather than timing the bottom. This matches your documented strategy of 'no single entry over 25% of position.'",
    icon: <Sparkles className="w-4 h-4" />,
    highlight: 'success',
  },
];

function useTypewriter(text: string, speed: number = 30, enabled: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText('');
      setIsComplete(false);
      return;
    }

    let index = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayedText, isComplete };
}

function ChatBubble({
  message,
  isTyping,
  onTypingComplete
}: {
  message: ChatMessage;
  isTyping: boolean;
  onTypingComplete: () => void;
}) {
  const { displayedText, isComplete } = useTypewriter(
    message.content,
    message.type === 'assistant' ? 25 : 15,
    true
  );
  const hasCalledComplete = useRef(false);

  useEffect(() => {
    if (isComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onTypingComplete();
    }
  }, [isComplete, onTypingComplete]);

  const isUser = message.type === 'user';

  const highlightStyles = {
    warning: 'border-l-4 border-l-amber-500/50 bg-amber-500/5',
    insight: 'border-l-4 border-l-blue-500/50 bg-blue-500/5',
    success: 'border-l-4 border-l-emerald-500/50 bg-emerald-500/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary/20 text-foreground'
            : `bg-card/60 border border-border/30 ${message.highlight ? highlightStyles[message.highlight] : ''}`
        }`}
      >
        {!isUser && message.icon && (
          <div className={`flex items-center gap-2 mb-1.5 text-xs font-medium ${
            message.highlight === 'warning' ? 'text-amber-400' :
            message.highlight === 'insight' ? 'text-blue-400' :
            message.highlight === 'success' ? 'text-emerald-400' :
            'text-muted-foreground'
          }`}>
            {message.icon}
            <span>
              {message.highlight === 'warning' ? 'Pattern Detected' :
               message.highlight === 'insight' ? 'Market Intelligence' :
               message.highlight === 'success' ? 'Recommendation' : 'deepstack'}
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed">
          {displayedText}
          {isTyping && !isComplete && (
            <span className="inline-block w-0.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
          )}
        </p>
      </div>
    </motion.div>
  );
}

export function TypewriterChatDemo() {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [currentlyTyping, setCurrentlyTyping] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to start animation when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setIsInView(true);
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  // Start the demo when in view
  useEffect(() => {
    if (isInView && !hasStarted) {
      setHasStarted(true);
      // Start with first message after a short delay
      setTimeout(() => {
        setVisibleMessages([1]);
        setCurrentlyTyping(1);
      }, 500);
    }
  }, [isInView, hasStarted]);

  const handleTypingComplete = useCallback((messageId: number) => {
    setCurrentlyTyping(null);

    // Find next message
    const nextMessage = DEMO_CONVERSATION.find(m => m.id === messageId + 1);
    if (nextMessage) {
      // Add delay before next message
      const delay = nextMessage.type === 'user' ? 800 : 400;
      setTimeout(() => {
        setVisibleMessages(prev => [...prev, nextMessage.id]);
        setCurrentlyTyping(nextMessage.id);
      }, delay);
    }
  }, []);

  const handleRestart = () => {
    setVisibleMessages([]);
    setCurrentlyTyping(null);
    setHasStarted(false);
    setTimeout(() => {
      setHasStarted(true);
      setVisibleMessages([1]);
      setCurrentlyTyping(1);
    }, 300);
  };

  const isComplete = visibleMessages.length === DEMO_CONVERSATION.length && currentlyTyping === null;

  return (
    <div ref={containerRef} className="relative">
      {/* Chat container */}
      <div className="bg-background/80 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">deepstack AI</p>
              <p className="text-xs text-muted-foreground">Research Assistant</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 min-h-[320px] max-h-[400px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {DEMO_CONVERSATION.filter(m => visibleMessages.includes(m.id)).map(message => (
              <ChatBubble
                key={message.id}
                message={message}
                isTyping={currentlyTyping === message.id}
                onTypingComplete={() => handleTypingComplete(message.id)}
              />
            ))}
          </AnimatePresence>

          {/* Waiting indicator */}
          {!isComplete && visibleMessages.length > 0 && currentlyTyping === null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground text-sm pl-2"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer / Restart */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 border-t border-border/30 bg-card/20"
          >
            <button
              onClick={handleRestart}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Replay demo
            </button>
          </motion.div>
        )}
      </div>

      {/* Caption */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        See how deepstack catches emotional patterns and validates ideas
      </p>
    </div>
  );
}
