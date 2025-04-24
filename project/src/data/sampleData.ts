import { NodeOptions, EdgeOptions } from 'vis-network';

interface Node extends NodeOptions {
  id: string;
  label: string;
  group?: string;
  title?: string;
}

interface Edge extends EdgeOptions {
  id: string;
  from: string;
  to: string;
  label?: string;
  title?: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export const sampleGraphData: GraphData = {
  nodes: [
    { id: '1', label: 'HTML5/CSS3', group: 'frontend', title: 'Frontend Technology' },
    { id: '2', label: 'Vanilla JS', group: 'frontend', title: 'Frontend Technology' },
    { id: '3', label: 'React', group: 'frontend', title: 'Frontend Technology' },
    { id: '4', label: 'Vis.js', group: 'frontend', title: 'Graph Visualization' },
    { id: '5', label: 'Flask', group: 'backend', title: 'Backend Framework' },
    { id: '6', label: 'PostgreSQL', group: 'database', title: 'Database' },
    { id: '7', label: 'OpenRouter API', group: 'api', title: 'External API' },
    { id: '8', label: 'Gemma 3 AI', group: 'api', title: 'AI Model' },
    { id: '9', label: 'WebSocket API', group: 'api', title: 'Real-time API' },
    { id: '10', label: 'Flask-SocketIO', group: 'backend', title: 'Backend Technology' },
    { id: '11', label: 'Component State', group: 'state', title: 'Frontend State Management' },
    { id: '12', label: 'Network Graphs', group: 'visualization', title: 'Visualization Type' },
    { id: '13', label: '/chat', group: 'route', title: 'API Route' },
    { id: '14', label: '/history', group: 'route', title: 'API Route' },
    { id: '15', label: '/clear', group: 'route', title: 'API Route' },
    { id: '16', label: 'Hugging Face', group: 'api', title: 'External API' },
    { id: '17', label: 'NLP Processing', group: 'feature', title: 'AI Feature' },
    { id: '18', label: 'Clustering', group: 'feature', title: 'AI Feature' },
  ],
  edges: [
    { id: 'e1', from: '1', to: '3', label: 'uses' },
    { id: 'e2', from: '2', to: '3', label: 'enhances' },
    { id: 'e3', from: '3', to: '11', label: 'manages' },
    { id: 'e4', from: '3', to: '4', label: 'integrates' },
    { id: 'e5', from: '4', to: '12', label: 'visualizes' },
    { id: 'e6', from: '5', to: '13', label: 'exposes' },
    { id: 'e7', from: '5', to: '14', label: 'exposes' },
    { id: 'e8', from: '5', to: '15', label: 'exposes' },
    { id: 'e9', from: '5', to: '6', label: 'stores in' },
    { id: 'e10', from: '5', to: '7', label: 'calls' },
    { id: 'e11', from: '7', to: '8', label: 'uses' },
    { id: 'e12', from: '5', to: '10', label: 'uses' },
    { id: 'e13', from: '10', to: '9', label: 'implements' },
    { id: 'e14', from: '5', to: '16', label: 'calls' },
    { id: 'e15', from: '16', to: '17', label: 'provides' },
    { id: 'e16', from: '16', to: '18', label: 'provides' },
    { id: 'e17', from: '3', to: '5', label: 'calls' },
  ],
};

// Dynamic color mapping based on group
export const getGroupColors = () => ({
  frontend: { color: { background: '#3B82F6', border: '#1E40AF' } },
  backend: { color: { background: '#8B5CF6', border: '#5B21B6' } },
  database: { color: { background: '#06B6D4', border: '#0E7490' } },
  api: { color: { background: '#10B981', border: '#065F46' } },
  state: { color: { background: '#F97316', border: '#C2410C' } },
  visualization: { color: { background: '#EF4444', border: '#B91C1C' } },
  route: { color: { background: '#A855F7', border: '#7E22CE' } },
  feature: { color: { background: '#EC4899', border: '#BE185D' } },
});