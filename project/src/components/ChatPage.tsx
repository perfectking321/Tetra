import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { sendChatMessage, getCohereEmbedding } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
}

interface ChatPageProps {
  graphData?: {
    nodes: any[];
    edges: any[];
  };
  messages: any[];
  setMessages: (messages: any[]) => void;
  onUpdateGraph?: (nodes: any[], edges: any[]) => void;
  onHighlightNodes?: (nodeIds: string[]) => void;
  startNewChat?: () => string;
}

// Utility: cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

const ChatPage: React.FC<ChatPageProps> = ({ 
  graphData, 
  messages,
  setMessages,
  onUpdateGraph,
  onHighlightNodes,
  startNewChat
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [graphReady, setGraphReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setGraphReady(!!graphData && Array.isArray(graphData.nodes));
  }, [graphData]);

  if (!graphData || !Array.isArray(graphData.nodes)) {
    return <div className="p-4 text-neutral-500">Loading chat context...</div>;
  }

  const handleNewChat = () => {
    if (startNewChat) {
      startNewChat();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!graphReady && startNewChat) {
      startNewChat();
      setInput('');
      return;
    }
    const messageId = Date.now().toString();
    const userMessage = {
      id: messageId,
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    setIsLoading(true);
    try {
      // 1. Get embedding for the new message
      const embedding = await getCohereEmbedding(input);

      // 2. Add user message node to graph with embedding
      let nodes = Array.isArray(graphData.nodes) ? [...graphData.nodes] : [];
      let edges = Array.isArray(graphData.edges) ? [...graphData.edges] : [];
      const newNode = {
        id: `message_${messageId}`,
        label: input,
        size: 16,
        embedding
      };

      // 3. Find related nodes by cosine similarity
      nodes.forEach(node => {
        if (node.embedding) {
          const sim = cosineSimilarity(node.embedding, embedding);
          if (sim > 0.7) {
            edges.push({
              id: `edge_${Date.now()}_${Math.random()}`,
              from: node.id,
              to: newNode.id,
              label: 'related'
            });
          }
        }
      });
      nodes.push(newNode);
      if (onUpdateGraph) {
        onUpdateGraph(nodes, edges);
      }

      // 4. Update chat history (user message)
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');

      // 5. AI response
      const response = await sendChatMessage(input, graphData);
      const aiMessage = {
        id: (Date.now()).toString(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([...updatedMessages, aiMessage]);

      // 6. Attach LLM answer to the user message node in the graph
      if (onUpdateGraph) {
        const nodesWithAnswer = nodes.map(n =>
          n.id === newNode.id ? { ...n, llmAnswer: aiMessage.content } : n
        );
        onUpdateGraph(nodesWithAnswer, edges);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now().toString(),
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'An unexpected error occurred. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([...messages, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageClick = (message: ChatMessage) => {
    if (onHighlightNodes && message.sender === 'user') {
      onHighlightNodes([`message_${message.id}`]);
    }
  };
  const handleMouseLeave = () => {
    if (onHighlightNodes) {
      onHighlightNodes([]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-neutral-200/50 dark:border-neutral-700/50 flex justify-between items-center">
        <h2 className="text-lg font-medium">Chat</h2>
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg transition-colors hover:bg-green-100 dark:hover:bg-green-900/40 flex items-center justify-center group"
          title="Start New Chat"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400 group-hover:scale-125 transition-transform duration-150">
            <line x1="10" y1="4" x2="10" y2="16"></line>
            <line x1="4" y1="10" x2="16" y2="10"></line>
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <div className="overflow-y-auto h-full max-h-[60vh] p-4 space-y-4">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                onClick={() => handleMessageClick(message)}
                onMouseLeave={handleMouseLeave}
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                    : 'glass-effect'
                } ${message.sender === 'user' ? 'cursor-pointer hover:ring-2 hover:ring-green-400/30' : ''}`}
              >
                <p className="leading-relaxed">{message.content}</p>
                <p className="text-xs mt-2 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-neutral-200/50 dark:border-neutral-700/50">
        <form onSubmit={e => e.preventDefault()}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Learn something new today"
              className="flex-1 py-2 px-3 rounded-lg bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              disabled={isLoading || !graphReady}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !graphReady}
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
      </div>
    </div>
  );
};

export default ChatPage;