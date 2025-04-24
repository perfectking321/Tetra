import React, { useEffect, useRef, useState } from 'react';
import { Network, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import { ZoomIn, ZoomOut, Maximize, Filter, Settings, Layers } from 'lucide-react';

interface GraphNode {
  id: string;  // Change to string only for consistency
  label: string;
  size?: number;
  group?: string;
  title?: string;
  embedding?: number[]; // Added embedding property
}

interface GraphEdge {
  id: string | number;
  from: string | number;
  to: string | number;
  label?: string;
}

interface GraphVisualizationProps {
  className?: string;
  graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
  highlightedNodes?: string[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ 
  className = '', 
  graphData,
  highlightedNodes = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDatasetRef = useRef<DataSet<GraphNode> | null>(null);
  const edgesDatasetRef = useRef<DataSet<GraphEdge> | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isClusterMode, setIsClusterMode] = useState(false);
  const [clusterTopic, setClusterTopic] = useState('');
  const [showClusterInput, setShowClusterInput] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editPopup, setEditPopup] = useState<{
    visible: boolean;
    nodeId: string | null;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    dragging: boolean;
  }>({ visible: false, nodeId: null, x: 200, y: 200, offsetX: 0, offsetY: 0, dragging: false });
  const [editForm, setEditForm] = useState<{ label: string; size: number; comment: string; color?: string }>({ label: '', size: 40, comment: '', color: '#0ea5e9' });
  const popupRef = useRef<HTMLDivElement>(null);

  // Cluster mode selection state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [showClusterNameInput, setShowClusterNameInput] = useState(false);
  const [clusterName, setClusterName] = useState("");

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterLabel, setFilterLabel] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filteredGraph, setFilteredGraph] = useState(graphData);

  const [showClusterBanner, setShowClusterBanner] = useState(false);

  const [autoClustered, setAutoClustered] = useState(false);

  // --- Cluster Info/Highlight/Rename State ---
  const [activeClusterNode, setActiveClusterNode] = useState<string | null>(null);
  const [showClusterInfo, setShowClusterInfo] = useState(false);
  const [clusterInfo, setClusterInfo] = useState<{ id: string; members: GraphNode[] } | null>(null);
  const [renamingClusterId, setRenamingClusterId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Always enable/disable multiselect based on isClusterMode
  useEffect(() => {
    if (!networkRef.current) return;
    if (isClusterMode) {
      networkRef.current.setOptions({
        interaction: {
          multiselect: true,
          selectable: true,
          selectConnectedEdges: false,
          dragNodes: true,
          dragView: true,
          zoomView: true
        }
      });
      // Use vis-network's default multi-select (Shift key)
      const selectHandler = (params: { nodes: (string | number)[] }) => {
        setSelectedNodes(params.nodes.map(id => id.toString()));
        if (params.nodes.length >= 2 && !showClusterNameInput) {
          setShowClusterNameInput(true);
        } else if (params.nodes.length < 2 && showClusterNameInput) {
          setShowClusterNameInput(false);
        }
      };
      networkRef.current.on('select', selectHandler);
      return () => {
        networkRef.current?.off('select', selectHandler);
      };
    } else {
      networkRef.current.setOptions({
        interaction: {
          multiselect: false,
          selectable: true,
          selectConnectedEdges: false,
          dragNodes: true,
          dragView: true,
          zoomView: true
        }
      });
      setSelectedNodes([]);
      setShowClusterNameInput(false);
      setClusterName("");
      networkRef.current.setSelection({ nodes: [], edges: [] });
    }
  }, [isClusterMode, showClusterNameInput]);

  // Add cluster-related state
  const [clusters, setClusters] = useState<{ [key: string]: string[] }>({});

  const handleClusterToggle = () => {
    if (isClusterMode) {
      // Exiting cluster mode - clear selections and reset options
      setIsClusterMode(false);
      setSelectedNodes([]);
      setShowClusterNameInput(false);
      setClusterName("");
      
      if (networkRef.current) {
        networkRef.current.setOptions({ 
          interaction: { 
            multiselect: false,
            selectable: true
          }
        });
        networkRef.current.setSelection({ nodes: [], edges: [] });
      }
    } else {
      // Entering cluster mode - enable multi-select
      setIsClusterMode(true);
      if (networkRef.current) {
        networkRef.current.setOptions({ 
          interaction: { 
            multiselect: true,
            selectable: true,
            selectConnectedEdges: false
          }
        });
      }
    }
  };

  // Show banner when clustering mode is activated
  useEffect(() => {
    if (isClusterMode) {
      setShowClusterBanner(true);
      const timer = setTimeout(() => setShowClusterBanner(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setShowClusterBanner(false);
    }
  }, [isClusterMode]);

  // Only initialize the network once and handle updates properly
  useEffect(() => {
    if (!containerRef.current) return;

    const { nodes, edges } = filteredGraph;
    const nodesDataset = new DataSet(nodes || []);
    const edgesDataset = new DataSet(edges || []);
    nodesDatasetRef.current = nodesDataset;
    edgesDatasetRef.current = edgesDataset;

    if (!networkRef.current) {
      const options: Options = {
        nodes: {
          shape: 'dot',
          size: 40, // Default node size set to 40
          font: {
            size: 14,
            face: 'Satoshi',
            color: '#525252',
          },
          color: {
            border: '#0ea5e9',
            background: '#e0f2fe',
            highlight: {
              border: '#0284c7',
              background: '#bae6fd'
            },
            hover: {
              border: '#0284c7',
              background: '#bae6fd'
            }
          },
          borderWidth: 2,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.1)',
            size: 5,
            x: 0,
            y: 2
          },
          chosen: true
        },
        edges: {
          color: {
            color: '#94a3b8',
            highlight: '#64748b',
            hover: '#64748b',
          },
          width: 1.5,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.1)',
            size: 5,
            x: 0,
            y: 2
          },
          smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.5
          },
        },
        physics: {
          enabled: true,
          stabilization: {
            enabled: true,
            iterations: 100,
            updateInterval: 50,
          },
          barnesHut: {
            gravitationalConstant: -80000,
            springConstant: 0.001,
            springLength: 200,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true,
          dragNodes: true,
          hideEdgesOnDrag: false,
          hideNodesOnDrag: false,
        }
      };

      const network = new Network(
        containerRef.current,
        { nodes: nodesDataset, edges: edgesDataset },
        options
      );
      networkRef.current = network;

      network.on('zoom', (params) => {
        setZoom(Math.round(params.scale * 100));
      });

      // Tooltip for LLM answer
      network.on('hoverNode', function(params) {
        const nodeId = params.node;
        const node = nodesDataset.get(nodeId);
        if (node && node.llmAnswer) {
          // Truncate to first 20 words
          let words = node.llmAnswer.split(/\s+/).slice(0, 20).join(' ');
          if (node.llmAnswer.split(/\s+/).length > 20) words += '...';
          network.canvas.body.container.title = words;
        } else if (node && node.title) {
          network.canvas.body.container.title = node.title;
        } else if (node && node.label) {
          network.canvas.body.container.title = node.label;
        } else {
          network.canvas.body.container.title = '';
        }
      });
      network.on('blurNode', function() {
        network.canvas.body.container.title = '';
      });
    } else {
      networkRef.current.setData({ nodes: nodesDataset, edges: edgesDataset });
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [filteredGraph]);

  // Add effect to handle node highlighting with proper type checking
  useEffect(() => {
    if (!networkRef.current || !nodesDatasetRef.current) return;
    
    const allNodes = nodesDatasetRef.current.get();
    const updates = [];
    
    for (const node of allNodes) {
      if (typeof node.id === 'string' && highlightedNodes.includes(node.id)) {
        updates.push({
          id: node.id,
          color: {
            background: '#4ade80',
            border: '#22c55e',
            highlight: {
              background: '#86efac',
              border: '#4ade80'
            }
          }
        });
      } else {
        updates.push({
          id: node.id,
          color: undefined
        });
      }
    }
    
    nodesDatasetRef.current.update(updates);
  }, [highlightedNodes]);

  // Update click event handler to always be in sync with editMode
  useEffect(() => {
    if (!networkRef.current) return;
    const network = networkRef.current;
    const clickHandler = (params: any) => {
      if (editMode && params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodesDatasetRef.current?.get(nodeId) as any || {};
        setEditForm({
          label: node.label || '',
          size: node.size || 40, // Default to 40 if not set
          comment: node.title || '',
          color: node.color?.background || '#0ea5e9'
        });
        const pointer = params.pointer.DOM;
        setEditPopup({
          visible: true,
          nodeId,
          x: pointer.x,
          y: pointer.y,
          offsetX: 0,
          offsetY: 0,
          dragging: false
        });
      } else {
        setEditPopup(p => ({ ...p, visible: false }));
      }
    };
    network.on('click', clickHandler);
    return () => { network.off('click', clickHandler); };
  }, [editMode]);

  // Close popup on outside click
  useEffect(() => {
    if (!editPopup.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setEditPopup(p => ({ ...p, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editPopup.visible]);

  // Drag logic for popup
  const handlePopupMouseDown = (e: React.MouseEvent) => {
    setEditPopup(p => ({ ...p, dragging: true, offsetX: e.clientX - p.x, offsetY: e.clientY - p.y }));
  };
  useEffect(() => {
    if (!editPopup.dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setEditPopup(p => ({ ...p, x: e.clientX - p.offsetX, y: e.clientY - p.offsetY }));
    };
    const handleMouseUp = () => setEditPopup(p => ({ ...p, dragging: false }));
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editPopup.dragging]);

  // Handle clustering only when requested
  useEffect(() => {
    if (!networkRef.current) return;
    if (isClusterMode && clusterTopic) {
      const network = networkRef.current;
      const clusterOptionsByData = {
        joinCondition: (nodeOptions: any) => {
          return nodeOptions.label.toLowerCase().includes(clusterTopic.toLowerCase());
        },
        processProperties: (clusterOptions: any, childNodes: any[]) => {
          return {
            ...clusterOptions,
            label: `${clusterTopic} Cluster (${childNodes.length})`,
            color: {
              border: '#0ea5e9',
              background: '#e0f2fe',
            },
            borderWidth: 3,
            shape: 'dot',
            font: { size: 14, face: 'Satoshi' }
          };
        },
        clusterNodeProperties: {
          borderWidth: 3,
          shape: 'dot',
          font: { size: 14, face: 'Satoshi' },
          color: {
            border: '#0ea5e9',
            background: '#e0f2fe',
          }
        }
      };
      network.cluster(clusterOptionsByData);
    }
  }, [isClusterMode, clusterTopic]);

  // Enhanced cluster creation handler
  const handleCreateCluster = () => {
    if (!networkRef.current || selectedNodes.length < 2) return;

    const network = networkRef.current;
    const name = clusterName.trim() || `Cluster ${selectedNodes.length}`;

    // Fully connect all selected nodes to each other (undirected, no duplicates)
    const newEdges: any[] = [];
    for (let i = 0; i < selectedNodes.length; i++) {
      for (let j = i + 1; j < selectedNodes.length; j++) {
        newEdges.push({
          id: `cluster_edge_${selectedNodes[i]}_${selectedNodes[j]}_${Date.now()}_${Math.random()}`,
          from: selectedNodes[i],
          to: selectedNodes[j],
          label: name
        });
      }
    }

    // Add these edges to the vis network and the dataset
    if (edgesDatasetRef.current) {
      edgesDatasetRef.current.add(newEdges);
    }

    // --- ADD THIS: Persist the new edges in the app state ---
    if (typeof graphData !== 'undefined' && typeof (window as any).onUpdateGraph === 'function') {
      (window as any).onUpdateGraph(
        graphData.nodes,
        [...(graphData.edges || []), ...newEdges]
      );
    }
    // Or, if you have onUpdateGraph as a prop:
    if (typeof onUpdateGraph === 'function') {
      onUpdateGraph(
        graphData.nodes,
        [...(graphData.edges || []), ...newEdges]
      );
    }
    // --------------------------------------------------------

    // Reset cluster mode state
    setIsClusterMode(false);
    setSelectedNodes([]);
    setClusterName("");
    setShowClusterNameInput(false);

    // Deselect all nodes and disable multiselect
    network.setSelection({ nodes: [], edges: [] });
    network.setOptions({ interaction: { multiselect: false } });
  };

  // Fix cluster expansion handler
  useEffect(() => {
    if (!networkRef.current) return;
    
    const network = networkRef.current;
    const doubleClickHandler = (params: any) => {
      if (params.nodes.length === 1) {
        const nodeId = params.nodes[0];
        if (nodeId.startsWith('cluster_')) {
          network.openCluster(nodeId, {
            releaseFunction: (_clusterPosition: any, containedNodesPositions: any) => {
              return containedNodesPositions;
            }
          });
          // Remove cluster from state
          setClusters(prev => {
            const { [nodeId]: removed, ...rest } = prev;
            return rest;
          });
        }
      }
    };

    network.on('doubleClick', doubleClickHandler);
    return () => network.off('doubleClick', doubleClickHandler);
  }, []);

  // --- Cluster Highlight/Info/Rename Handlers ---
  useEffect(() => {
    if (!networkRef.current) return;
    const network = networkRef.current;
  
    // Highlight all cluster members on hover
    const hoverHandler = (params: any) => {
      const nodeId = params.node;
      if (typeof nodeId === 'string' && nodeId.startsWith('cluster_')) {
        // Find all nodes in this cluster
        const nodes = nodesDatasetRef.current?.get() || [];
        const members = nodes.filter(n => n.group === nodeId);
        setActiveClusterNode(nodeId);
        // Highlight all member nodes
        if (networkRef.current) {
          networkRef.current.selectNodes(members.map(m => m.id), false);
        }
      }
    };
    const blurHandler = (params: any) => {
      setActiveClusterNode(null);
      if (networkRef.current) {
        networkRef.current.unselectAll();
      }
    };
    // Show info panel on click
    const clickHandler = (params: any) => {
      if (params.nodes.length === 1 && typeof params.nodes[0] === 'string' && params.nodes[0].startsWith('cluster_')) {
        const nodeId = params.nodes[0];
        const nodes = nodesDatasetRef.current?.get() || [];
        const members = nodes.filter(n => n.group === nodeId);
        setClusterInfo({ id: nodeId, members });
        setShowClusterInfo(true);
      } else {
        setShowClusterInfo(false);
      }
    };
    // Double-click to rename cluster
    const doubleClickHandler = (params: any) => {
      if (params.nodes.length === 1 && typeof params.nodes[0] === 'string' && params.nodes[0].startsWith('cluster_')) {
        setRenamingClusterId(params.nodes[0]);
        setRenameValue('');
      }
    };
    network.on('hoverNode', hoverHandler);
    network.on('blurNode', blurHandler);
    network.on('click', clickHandler);
    network.on('doubleClick', doubleClickHandler);
    return () => {
      network.off('hoverNode', hoverHandler);
      network.off('blurNode', blurHandler);
      network.off('click', clickHandler);
      network.off('doubleClick', doubleClickHandler);
    };
  }, []);

  // --- Cluster Rename Logic ---
  const handleRenameCluster = () => {
    if (!renamingClusterId || !renameValue.trim() || !nodesDatasetRef.current) return;
    // Update all nodes in this cluster
    const nodes = nodesDatasetRef.current.get();
    const updates = nodes.filter(n => n.group === renamingClusterId).map(n => ({
      id: n.id,
      label: n.label.replace(/\n\[.*\]$/, `\n[${renameValue}]`)
    }));
    nodesDatasetRef.current.update(updates);
    setRenamingClusterId(null);
    setRenameValue('');
  };

  const handleZoomIn = () => {
    if (networkRef.current) {
      const newZoom = networkRef.current.getScale() * 1.2;
      networkRef.current.moveTo({ scale: newZoom });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const newZoom = networkRef.current.getScale() * 0.8;
      networkRef.current.moveTo({ scale: newZoom });
    }
  };

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit();
    }
  };

  const handleClusterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsClusterMode(true);
    setShowClusterInput(false);
  };

  // Edit form handlers
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: name === 'size' ? Number(value) : value }));
  };
  const handleEditSave = () => {
    if (!editPopup.nodeId || !nodesDatasetRef.current) return;
    nodesDatasetRef.current.update({
      id: editPopup.nodeId,
      label: editForm.label,
      size: editForm.size,
      title: editForm.comment,
      color: editForm.color ? { background: editForm.color, border: editForm.color, highlight: { background: editForm.color, border: editForm.color }, hover: { background: editForm.color, border: editForm.color } } : undefined
    });
    setEditPopup(p => ({ ...p, visible: false }));
  };
  const handleRemoveNode = () => {
    if (!editPopup.nodeId || !nodesDatasetRef.current) return;
    nodesDatasetRef.current.remove(editPopup.nodeId);
    setEditPopup(p => ({ ...p, visible: false }));
  };

  useEffect(() => {
    if (!graphData || !graphData.nodes) return;
    const nodes = graphData.nodes;
    let edges = graphData.edges ? [...graphData.edges] : [];
    const threshold = 0.7;

    // Find all pairs of user message nodes with embeddings
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        if (nodeA.embedding && nodeB.embedding) {
          const sim = cosineSimilarity(nodeA.embedding, nodeB.embedding);
          if (sim > threshold) {
            // Check if edge already exists
            const exists = edges.some(
              e =>
                (e.from === nodeA.id && e.to === nodeB.id) ||
                (e.from === nodeB.id && e.to === nodeA.id)
            );
            if (!exists) {
              edges.push({
                id: `edge_${nodeA.id}_${nodeB.id}_related`,
                from: nodeA.id,
                to: nodeB.id,
                label: 'related'
              });
            }
          }
        }
      }
    }
    // Optionally, update the graphData.edges here if you want to show these connections live
    // If you want to persist these edges, call your onUpdateGraph handler if available
  }, [graphData]);

  // Filtering logic
  useEffect(() => {
    if (!filterLabel && !filterGroup) {
      setFilteredGraph(graphData);
      return;
    }
    const nodes = graphData.nodes.filter(node => {
      const labelMatch = filterLabel ? node.label.toLowerCase().includes(filterLabel.toLowerCase()) : true;
      const groupMatch = filterGroup ? (node.group || '').toLowerCase().includes(filterGroup.toLowerCase()) : true;
      return labelMatch && groupMatch;
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = graphData.edges.filter(edge => nodeIds.has(edge.from.toString()) && nodeIds.has(edge.to.toString()));
    setFilteredGraph({ nodes, edges });
  }, [filterLabel, filterGroup, graphData]);

  // Automated clustering by label similarity and embeddings
  const handleAutoCluster = () => {
    if (!networkRef.current || !filteredGraph.nodes) return;
    const nodes = filteredGraph.nodes;
    const clusters = {};
    let clusterId = 1;
    const nodeToCluster = {};
    const threshold = 0.7; // Embedding similarity threshold

    // 1. Assign clusters
    nodes.forEach((node, i) => {
      const words = node.label.toLowerCase().split(/\W+/).filter(Boolean);
      let found = false;
      for (const [cid, ids] of Object.entries(clusters)) {
        const repNode = nodes.find(n => n.id === ids[0]);
        if (!repNode) continue;
        // Label word overlap
        const repWords = repNode.label.toLowerCase().split(/\W+/).filter(Boolean);
        const labelSimilar = words.some(w => repWords.includes(w));
        // Embedding similarity
        let embeddingSimilar = false;
        if (node.embedding && repNode.embedding) {
          const sim = cosineSimilarity(node.embedding, repNode.embedding);
          embeddingSimilar = sim > threshold;
        }
        if (labelSimilar || embeddingSimilar) {
          clusters[cid].push(node.id);
          nodeToCluster[node.id] = cid;
          found = true;
          break;
        }
      }
      if (!found) {
        const newId = `cluster_${clusterId++}`;
        clusters[newId] = [node.id];
        nodeToCluster[node.id] = newId;
      }
    });

    // 2. Assign distinct colors and border to clusters
    const palette = [
      '#e11d48', '#0ea5e9', '#22c55e', '#f59e42', '#a21caf', '#fbbf24', '#14b8a6', '#6366f1',
      '#f472b6', '#f87171', '#34d399', '#facc15', '#818cf8', '#f97316', '#38bdf8', '#a3e635'
    ];
    let colorMap = {};
    Object.keys(clusters).forEach((cid, i) => {
      colorMap[cid] = palette[i % palette.length];
    });
    const coloredNodes = nodes.map(node => ({
      ...node,
      group: nodeToCluster[node.id],
      color: {
        background: colorMap[nodeToCluster[node.id]],
        border: '#111',
        highlight: {
          background: colorMap[nodeToCluster[node.id]],
          border: '#000'
        },
        hover: {
          background: colorMap[nodeToCluster[node.id]],
          border: '#000'
        }
      },
      borderWidth: 3,
      font: { color: '#fff', size: 16, face: 'Satoshi', vadjust: 0 },
      label: `${node.label}\n[${nodeToCluster[node.id].replace('cluster_', 'C')}]`
    }));

    // 3. Reposition nodes in the same cluster closer together
    // Calculate cluster centers in a circle
    const clusterKeys = Object.keys(clusters);
    const centerX = 0, centerY = 0, radius = 300;
    let nodePositions = {};
    clusterKeys.forEach((cid, i) => {
      const angle = (2 * Math.PI * i) / clusterKeys.length;
      const cx = centerX + radius * Math.cos(angle);
      const cy = centerY + radius * Math.sin(angle);
      const members = clusters[cid];
      members.forEach((nid, j) => {
        // Spread nodes in a small circle around cluster center
        const subAngle = (2 * Math.PI * j) / members.length;
        nodePositions[nid] = {
          x: cx + 80 * Math.cos(subAngle),
          y: cy + 80 * Math.sin(subAngle)
        };
      });
    });

    // 4. Update the graph
    if (typeof onUpdateGraph === 'function') {
      onUpdateGraph(coloredNodes, filteredGraph.edges);
    }
    setTimeout(() => {
      if (networkRef.current) {
        Object.entries(nodePositions).forEach(([nid, pos]) => {
          networkRef.current.moveNode(nid, pos.x, pos.y);
        });
      }
    }, 300); // Wait for vis to update nodes
    setAutoClustered(true);
  };

  return (
    <div className={`relative flex-1 min-h-[500px] ${className}`} style={{ height: '100%' }}>
      {/* Clustering tutorial/info banner (only when clustering mode, auto-hide after 10s) */}
      {showClusterBanner && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-30 bg-primary-100 dark:bg-primary-900/80 text-primary-900 dark:text-primary-200 px-3 py-1 rounded shadow text-xs font-medium flex items-center gap-2 animate-fade-in">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="7" cy="7" r="6"/><line x1="7" y1="11" x2="7" y2="7"/><line x1="7" y1="4" x2="7.01" y2="4"/></svg>
          Hold <span className="font-bold">Shift</span> and your <span className="font-bold">left mouse button</span> to select nodes and connect them.
        </div>
      )}
      <div className="absolute top-4 left-4 z-10 glass-effect rounded-lg shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row gap-1 items-center">
            <button 
              onClick={handleZoomIn}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button 
              onClick={handleZoomOut}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <button 
              onClick={handleFit}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
              title="Fit view"
            >
              <Maximize size={18} />
            </button>
          </div>
          <div className="border-t border-neutral-200/50 dark:border-neutral-700/50 my-1"></div>
          <div className="flex flex-row gap-1 items-center">
            <button 
              onClick={handleClusterToggle}
              className={`p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors ${
                isClusterMode ? 'bg-primary-100/70 text-primary-500' : ''
              }`}
              title={isClusterMode ? 'Exit clustering mode' : 'Enter clustering mode'}
            >
              <Layers size={18} />
            </button>
            <button
              onClick={() => setEditMode(m => !m)}
              className={`p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors ${
                editMode ? 'text-primary-500' : ''
              }`}
              title="Edit Mode"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M15.232 5.232l-2.464-2.464a2 2 0 0 0-2.828 0l-6.464 6.464a2 2 0 0 0-.586 1.414V13a2 2 0 0 0 2 2h2.354a2 2 0 0 0 1.414-.586l6.464-6.464a2 2 0 0 0 0-2.828z"></path><path d="M13.5 6.5l-7 7"></path></svg>
            </button>
            <button 
              onClick={() => setShowFilterPanel(f => !f)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
              title="Filter graph"
            >
              <Filter size={18} />
            </button>
            <button
              onClick={handleAutoCluster}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
              title="Auto Cluster by Label Words"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkle"><path d="M12 3v2m0 12v2m7-7h-2M5 12H3m13.07-5.07l-1.42 1.42M6.93 17.07l-1.42 1.42m12.02 0l-1.42-1.42M6.93 6.93L5.51 5.51"/></svg>
            </button>
          </div>
        </div>
      </div>

      {showClusterInput && (
        <div className="absolute top-4 left-20 z-10 glass-effect rounded-lg shadow-lg p-4" style={{ minWidth: '250px' }}>
          <form onSubmit={handleClusterSubmit}>
            <label className="block text-sm font-medium mb-2">
              Enter Cluster Topic
            </label>
            <input
              type="text"
              value={clusterTopic}
              onChange={(e) => setClusterTopic(e.target.value)}
              className="w-full p-2 rounded-lg bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/30 mb-3"
              placeholder="e.g., Frontend, API, Database"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowClusterInput(false);
                  setIsClusterMode(false);
                  setClusterTopic('');
                }}
                className="px-3 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                disabled={!clusterTopic.trim()}
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      )}

      {showClusterNameInput && isClusterMode && (
        <div className="absolute top-4 left-20 z-10 glass-effect rounded-lg shadow-lg p-4" style={{ minWidth: '250px' }}>
          <form onSubmit={e => { e.preventDefault(); handleCreateCluster(); }}>
            <label className="block text-sm font-medium mb-2">
              Enter Cluster Name
            </label>
            <input
              type="text"
              value={clusterName}
              onChange={e => setClusterName(e.target.value)}
              className="w-full p-2 rounded-lg bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/30 mb-3"
              placeholder="e.g., Untitled Cluster"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowClusterNameInput(false);
                  setIsClusterMode(false);
                  setClusterName("");
                  setSelectedNodes([]);
                }}
                className="px-3 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                disabled={selectedNodes.length < 2}
              >
                Create Cluster
              </button>
            </div>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {selectedNodes.length < 2 ? 'Select at least 2 nodes.' : `${selectedNodes.length} node(s) selected.`}
            </div>
          </form>
        </div>
      )}

      {showFilterPanel && (
        <div className="absolute top-20 left-4 z-20 glass-effect rounded-lg shadow-lg p-4 min-w-[220px]">
          <div className="mb-2 font-semibold">Filter Nodes</div>
          <label className="block text-xs mb-1">Label contains</label>
          <input
            type="text"
            value={filterLabel}
            onChange={e => setFilterLabel(e.target.value)}
            className="w-full mb-2 p-1 rounded border"
            placeholder="e.g. React"
          />
          <label className="block text-xs mb-1">Group contains</label>
          <input
            type="text"
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="w-full mb-2 p-1 rounded border"
            placeholder="e.g. frontend"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setFilterLabel(''); setFilterGroup(''); }} className="px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-700 text-xs">Clear</button>
            <button onClick={() => setShowFilterPanel(false)} className="px-2 py-1 rounded bg-primary-500 text-white text-xs">Close</button>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {editPopup.visible && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-4 min-w-[260px]"
          style={{ left: editPopup.x, top: editPopup.y, cursor: editPopup.dragging ? 'move' : 'default' }}
        >
          <div className="flex justify-between items-center mb-2 cursor-move" onMouseDown={handlePopupMouseDown}>
            <span className="font-semibold">Edit Node</span>
            <button onClick={() => setEditPopup(p => ({ ...p, visible: false }))} className="ml-2 text-lg">×</button>
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Label
              <input name="label" value={editForm.label} onChange={handleEditChange} className="w-full p-1 rounded border mt-1" />
            </label>
            <label className="block text-sm">Size
              <input name="size" type="number" min={8} max={64} value={editForm.size} onChange={handleEditChange} className="w-full p-1 rounded border mt-1" />
            </label>
            <label className="block text-sm">Comment
              <textarea name="comment" value={editForm.comment} onChange={handleEditChange} className="w-full p-1 rounded border mt-1" />
            </label>
            <div className="flex items-center gap-2">
              <label className="block text-sm">Color</label>
              <input name="color" type="color" value={editForm.color || '#0ea5e9'} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 p-0 border-none bg-transparent" />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleEditSave} className="px-3 py-1 rounded bg-primary-500 text-white">Save</button>
              <button onClick={handleRemoveNode} className="px-3 py-1 rounded bg-red-500 text-white">Remove Node</button>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Info Panel */}
      {showClusterInfo && clusterInfo && (
        <div className="fixed top-20 right-8 z-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-4 min-w-[260px]">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Cluster Info</span>
            <button onClick={() => setShowClusterInfo(false)} className="ml-2 text-lg">×</button>
          </div>
          <div className="mb-2 text-sm">ID: <span className="font-mono">{clusterInfo.id}</span></div>
          <div className="mb-2 text-sm">Nodes: {clusterInfo.members.length}</div>
          <div className="mb-2 text-xs max-h-32 overflow-y-auto">
            <div className="font-semibold mb-1">Members:</div>
            <ul className="list-disc pl-4">
              {clusterInfo.members.map(m => (
                <li key={m.id}>{m.label.replace(/\n\[.*\]$/, '')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Cluster Rename Modal */}
      {renamingClusterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-6 min-w-[320px]">
            <div className="mb-4 font-semibold">Rename Cluster</div>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              className="w-full p-2 rounded border mb-4"
              placeholder="New cluster name"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenamingClusterId(null)} className="px-3 py-1 rounded bg-neutral-200 dark:bg-neutral-700">Cancel</button>
              <button onClick={handleRenameCluster} className="px-3 py-1 rounded bg-primary-500 text-white" disabled={!renameValue.trim()}>Rename</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 glass-effect rounded-lg shadow-lg px-3 py-1 text-sm">
        Zoom: {zoom}%
      </div>
      <div ref={containerRef} className="absolute inset-0" style={{ minHeight: 400, height: '100%' }} />
    </div>
  );
};

export default GraphVisualization;