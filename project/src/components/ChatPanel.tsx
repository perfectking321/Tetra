import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronUp, Clock, MessageSquare, X } from 'lucide-react';
import { sendChatMessage } from '../services/api';

interface ChatPanelProps {
  activeTab: 'chat' | 'history';
  className?: string;
  onClose?: () => void;
  onTabChange?: (tab: 'chat' | 'history') => void;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  activeTab, 
  className = '',
  onClose,
  onTabChange 
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Welcome to the Knowledge Graph AI assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);

  const [history, setHistory] = useState<{date: string; queries: string[]}[]>([
    {
      date: 'Today',
      queries: ['Graph visualization setup', 'Node clustering options', 'Semantic search integration']
    },
    {
      date: 'Yesterday',
      queries: ['Network analysis algorithms', 'Data import formats']
    }
  ]);

  const [suggestions] = useState([
    'How do I visualize my graph?',
    'Explain clustering algorithms',
    'Show me search examples'
  ]);
  
  const [showSuggestions, setShowSuggestions] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await sendChatMessage(input);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Add to history
      setHistory(prev => [{
        date: 'Today',
        queries: [input, ...prev[0].queries]
      }, ...prev.slice(1)]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : 'An error occurred',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryItemClick = (query: string) => {
    setInput(query);
    onTabChange?.('chat');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    // Optional: auto-send suggestion
    // handleSend();
  };

  return (
    <div className={`flex flex-col glass-effect ${className}`}>
      <div className="p-3 border-b border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between">
        <div className="flex space-x-4">
          <button 
            onClick={() => onTabChange?.('chat')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${
              activeTab === 'chat' 
                ? 'bg-primary-100/50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
            }`}
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
          
          <button 
            onClick={() => onTabChange?.('history')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${
              activeTab === 'history' 
                ? 'bg-primary-100/50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
            }`}
          >
            <Clock size={16} />
            <span>History</span>
          </button>
        </div>
        
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.sender === 'user' 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                      : 'glass-effect'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-neutral-200/50 dark:border-neutral-700/50">
            <form onSubmit={e => e.preventDefault()}>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your knowledge graph..."
                  className="flex-1 py-2 px-3 rounded-lg bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-lg bg-primary-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                >
                  {isLoading ? (
                    <div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>Powered by OpenAI GPT-3.5 Turbo</span>
              <button 
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-1 hover:text-primary-500 transition-colors"
              >
                <ChevronUp size={14} className={`transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
                <span>Suggestions</span>
              </button>
            </div>

            {showSuggestions && (
              <div className="mt-2 space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {history.map((day, index) => (
            <div key={index} className="mb-6">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                {day.date}
              </h3>
              <div className="space-y-2">
                {day.queries.map((query, qIndex) => (
                  <button 
                    key={qIndex}
                    onClick={() => handleHistoryItemClick(query)}
                    className="w-full text-left p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2 group"
                  >
                    <Clock size={16} className="text-neutral-400 group-hover:text-primary-500 transition-colors" />
                    <span>{query}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatPanel;