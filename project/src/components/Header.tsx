import React from 'react';
import { Moon, Sun, Network, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="border-b border-neutral-200/50 dark:border-neutral-700/50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="5" x2="15" y2="5"></line>
              <line x1="3" y1="9" x2="15" y2="9"></line>
              <line x1="3" y1="13" x2="15" y2="13"></line>
            </svg>
          </button>
          <h1 className="text-lg font-medium">SEQUEL AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors ${location.pathname === '/' ? 'text-primary-500' : ''}`}
            aria-label="Graph Mode"
            title="Graph Mode"
          >
            <Network size={20} />
          </Link>
          <Link
            to="/chat"
            className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors ${location.pathname === '/chat' ? 'text-primary-500' : ''}`}
            aria-label="Chat Mode"
            title="Chat Mode"
          >
            <MessageSquare size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;