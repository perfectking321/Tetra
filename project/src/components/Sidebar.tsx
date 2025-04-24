import React from 'react';
import { 
  Network, 
  Settings, 
  Share2, 
  Save, 
  FolderOpen
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  graphHistory?: { id: string; nodes: any[]; edges: any[]; createdAt: string; name: string }[];
  onRestoreGraph?: (graphId: string) => void;
  activeGraphId?: string;
  onRenameGraph?: (id: string, newName: string) => void;
  onSaveGraph?: () => void;
  onOpenGraph?: (file: File) => void;
  onShareGraph?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className = '', 
  graphHistory = [], 
  onRestoreGraph, 
  activeGraphId, 
  onRenameGraph,
  onSaveGraph,
  onOpenGraph,
  onShareGraph
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [tempName, setTempName] = React.useState<string>("");

  // File input ref for Open
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={`${className} glass-effect p-4 flex flex-col relative`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">History</h2>
      </div>
      
      <nav className="flex-1 overflow-y-auto space-y-1">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
            Recent Graphs & Chats
          </h2>
          {graphHistory.length === 0 && (
            <div className="text-neutral-400 text-sm mb-2">No previous graphs or chats.</div>
          )}
          <div className="space-y-1">
            {graphHistory.map((graph) => (
              <div key={graph.id} className="flex items-center gap-2 w-full">
                <button
                  className={`flex-1 text-left py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors flex items-center gap-2 ${graph.id === activeGraphId ? 'bg-primary-100/50 text-primary-600 dark:bg-primary-900/20' : ''}`}
                  onClick={() => onRestoreGraph && onRestoreGraph(graph.id)}
                  title={`Created at ${new Date(graph.createdAt).toLocaleString()}`}
                >
                  <Network size={16} className="text-primary-500" />
                  {editingId === graph.id ? (
                    <input
                      autoFocus
                      className="w-28 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-xs bg-transparent focus:bg-white dark:focus:bg-neutral-800 focus:outline-none"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onBlur={() => {
                        setEditingId(null);
                        if (tempName.trim() && tempName !== graph.name && onRenameGraph) {
                          onRenameGraph(graph.id, tempName.trim());
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setEditingId(null);
                          if (tempName.trim() && tempName !== graph.name && onRenameGraph) {
                            onRenameGraph(graph.id, tempName.trim());
                          }
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="truncate cursor-pointer"
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setEditingId(graph.id);
                        setTempName(graph.name);
                      }}
                    >
                      {graph.name}
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
            Tools
          </h2>
          <div className="space-y-1">
            <button
              className="w-full text-left py-2 px-3 rounded-lg transition-colors flex items-center gap-2 group hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
              onClick={onSaveGraph}
              type="button"
            >
              <span className="text-neutral-500 group-hover:text-primary-500 transition-colors">
                <Save size={16} />
              </span>
              <span>Save</span>
            </button>
            <button
              className="w-full text-left py-2 px-3 rounded-lg transition-colors flex items-center gap-2 group hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <span className="text-neutral-500 group-hover:text-primary-500 transition-colors">
                <FolderOpen size={16} />
              </span>
              <span>Open</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file && onOpenGraph) {
                  onOpenGraph(file);
                  e.target.value = '';
                }
              }}
            />
            <button 
              className="w-full text-left py-2 px-3 rounded-lg transition-colors flex items-center gap-2 group hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
              onClick={onShareGraph}
              type="button"
            >
              <span className="text-neutral-500 group-hover:text-primary-500 transition-colors">
                <Share2 size={16} />
              </span>
              <span>Share</span>
            </button>
            <button 
              className="w-full text-left py-2 px-3 rounded-lg transition-colors flex items-center gap-2 group hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
              type="button"
            >
              <span className="text-neutral-500 group-hover:text-primary-500 transition-colors">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <span>User Settings</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;