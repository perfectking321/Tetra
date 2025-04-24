import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import GraphVisualization from './components/GraphVisualization';
import ChatPage from './components/ChatPage';
import Header from './components/Header';
import { useTheme } from './context/ThemeContext';

const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

interface GraphType {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  messages: any[]; // Add messages property
}

function App() {
  const { theme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [graphs, setGraphs] = useState<GraphType[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string>('');
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);

  const navigate = useNavigate();

  // Ensure activeGraphId is always valid
  useEffect(() => {
    if (graphs.length > 0 && !graphs.find(g => g.id === activeGraphId)) {
      setActiveGraphId(graphs[0].id);
    }
  }, [graphs, activeGraphId]);

  // Ensure proper graph initialization
  useEffect(() => {
    if (!activeGraphId && graphs.length > 0) {
      setActiveGraphId(graphs[0].id);
    }
  }, [graphs, activeGraphId]);

  // Create a new graph for a chat session and set as active
  const startNewChat = () => {
    const newGraph = {
      id: Date.now().toString(),
      name: `Chat ${graphs.length + 1}`,
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      messages: [{
        id: Date.now().toString(),
        content: "Hi i am your Sequel AI Assistant, How should i help you?",
        sender: 'ai',
        timestamp: new Date()
      }],
    };
    setGraphs(prev => [newGraph, ...prev]);
    setActiveGraphId(newGraph.id);
    navigate('/chat'); // <-- Only navigate here
    return newGraph.id;
  };

  // Handler to update the active graph's nodes/edges (do not overwrite messages)
  const setActiveGraphData = (data: { nodes: any[]; edges: any[] }) => {
    if (!activeGraphId) return;
    setGraphs(prev => prev.map(g =>
      g.id === activeGraphId ? { ...g, nodes: data.nodes, edges: data.edges } : g
    ));
  };

  // Handler to update the active graph's messages
  const setActiveGraphMessages = (messages: any[]) => {
    if (!activeGraphId) return;
    setGraphs(prev => prev.map(g => {
      if (g.id !== activeGraphId) return g;
      // If the name is default and first user message exists, update the name
      if (g.name.startsWith('Chat') && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.sender === 'user');
        if (firstUserMsg && firstUserMsg.content) {
          // Truncate to first 8 words or 40 chars
          let title = firstUserMsg.content.trim().split(/\s+/).slice(0, 8).join(' ');
          if (title.length > 40) title = title.slice(0, 40) + '...';
          return { ...g, messages, name: title };
        }
      }
      return { ...g, messages };
    }));
  };

  // Handler to restore a graph from history and go to chat
  const handleRestoreGraph = (id: string) => {
    setActiveGraphId(id);
    navigate('/chat');
  };

  const handleRenameGraph = (id: string, newName: string) => {
    setGraphs(prev => prev.map(g => g.id === id ? { ...g, name: newName } : g));
  };

  // Handler for when chat messages reference nodes
  const handleNodeHighlight = (nodeIds: string[]) => {
    setHighlightedNodes(nodeIds);
  };

  // --- Save/Load Graph as JSON File ---
  const handleSaveGraph = () => {
    if (!activeGraphId) return;
    const graph = graphs.find(g => g.id === activeGraphId);
    if (!graph) return;
    const dataStr = JSON.stringify(graph, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.name || 'graph'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenGraph = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (!result || typeof result !== 'string') return;
        const graph = JSON.parse(result);
        if (!graph.id) graph.id = Date.now().toString();
        if (!graph.createdAt) graph.createdAt = new Date().toISOString();
        if (!graph.name) graph.name = `Imported Graph`;
        if (!graph.nodes) graph.nodes = [];
        if (!graph.edges) graph.edges = [];
        if (!graph.messages) graph.messages = [];
        setGraphs(prev => [graph, ...prev]);
        setActiveGraphId(graph.id);
      } catch (err) {
        alert('Invalid graph file.');
      }
    };
    reader.readAsText(file);
  };

  // --- Share Graph ---
  const handleShareGraph = async () => {
    if (!activeGraphId) return;
    const graph = graphs.find(g => g.id === activeGraphId);
    if (!graph) return;
    // For demo: copy JSON to clipboard and alert user
    try {
      await navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
      alert('Graph JSON copied to clipboard! You can now share it.');
    } catch (e) {
      alert('Failed to copy graph to clipboard.');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-dot-pattern bg-dot-sm ${
      theme === 'dark' 
        ? 'bg-neutral-900 text-neutral-50' 
        : 'bg-neutral-50 text-neutral-900'
    } transition-colors duration-300`}>
      <Header 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Sidebar with smooth transition */}
        <div
          style={{
            transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s',
            width: isSidebarOpen ? 256 : 0, // 64 * 4 = 256px
            opacity: isSidebarOpen ? 1 : 0,
            minWidth: 0,
            overflow: 'hidden',
            pointerEvents: isSidebarOpen ? 'auto' : 'none',
            zIndex: 10,
          }}
        >
          {isSidebarOpen && (
            <Sidebar 
              className="w-64 flex-shrink-0 rounded-lg shadow-xl animate-fade-in"
              graphHistory={graphs}
              onRestoreGraph={handleRestoreGraph}
              activeGraphId={activeGraphId}
              onRenameGraph={handleRenameGraph}
              onSaveGraph={handleSaveGraph}
              onOpenGraph={handleOpenGraph}
              onShareGraph={handleShareGraph}
            />
          )}
        </div>
        <main className="flex-1 overflow-hidden flex flex-col rounded-lg shadow-xl glass-effect">
          <Routes>
            <Route path="/" element={
              <GraphVisualization 
                className="flex-1" 
                graphData={{
                  nodes: activeGraphId ? (graphs.find(g => g.id === activeGraphId)?.nodes || []) : [],
                  edges: activeGraphId ? (graphs.find(g => g.id === activeGraphId)?.edges || []) : []
                }} 
                highlightedNodes={highlightedNodes}
              />
            } />
            <Route path="/chat" element={
              <ChatPage 
                graphData={{
                  nodes: activeGraphId ? (graphs.find(g => g.id === activeGraphId)?.nodes || []) : [],
                  edges: activeGraphId ? (graphs.find(g => g.id === activeGraphId)?.edges || []) : []
                }}
                messages={activeGraphId ? (graphs.find(g => g.id === activeGraphId)?.messages || []) : []}
                setMessages={setActiveGraphMessages}
                onUpdateGraph={(nodes, edges) => 
                  setActiveGraphData({ nodes, edges })
                }
                onHighlightNodes={handleNodeHighlight}
                startNewChat={startNewChat}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;