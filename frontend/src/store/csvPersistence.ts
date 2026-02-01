/**
 * CSV Persistence Layer
 * 
 * Integrates CSV loading/saving with the graph store.
 * - Loads initial data from CSV files in public/data/
 * - Persists changes to localStorage
 * - Provides export/import functionality
 */

import { useGraphStore } from './graphStore';
import { CSVService } from '../core/services/csv.service';
import type { GraphNode, GraphEdge } from '../types/graph';

// =============================================================================
// CONSTANTS
// =============================================================================

const CSV_URLS = {
  NODES: '/data/nodes.csv',
  EDGES: '/data/edges.csv',
};

// Track initialization state
let isInitialized = false;
let isLoading = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the graph from CSV data.
 * First checks localStorage for saved data, then falls back to CSV files.
 */
export async function initializeFromCSV(): Promise<{
  nodesLoaded: number;
  edgesLoaded: number;
  source: 'localStorage' | 'csv';
}> {
  if (isLoading) {
    throw new Error('Already loading CSV data');
  }
  
  isLoading = true;
  
  try {
    // Check if we have saved data in localStorage
    if (CSVService.hasStoredData()) {
      const nodes = CSVService.loadNodesFromStorage();
      const edges = CSVService.loadEdgesFromStorage();
      
      if (nodes && nodes.length > 0) {
        importToStore(nodes, edges || []);
        isInitialized = true;
        
        return {
          nodesLoaded: nodes.length,
          edgesLoaded: edges?.length || 0,
          source: 'localStorage',
        };
      }
    }
    
    // Load from CSV files
    const [nodes, edges] = await Promise.all([
      CSVService.loadNodesFromFile(CSV_URLS.NODES),
      CSVService.loadEdgesFromFile(CSV_URLS.EDGES),
    ]);
    
    importToStore(nodes, edges);
    
    // Save to localStorage for persistence
    CSVService.saveNodesToStorage(nodes);
    CSVService.saveEdgesToStorage(edges);
    
    isInitialized = true;
    
    return {
      nodesLoaded: nodes.length,
      edgesLoaded: edges.length,
      source: 'csv',
    };
  } finally {
    isLoading = false;
  }
}

/**
 * Import nodes and edges into the graph store
 */
function importToStore(nodes: GraphNode[], edges: GraphEdge[]): void {
  const store = useGraphStore.getState();
  
  // Clear existing data
  store.clear();
  
  // Import nodes
  nodes.forEach(node => {
    store.nodes.set(node.id, node);
  });
  
  // Import edges and build index
  edges.forEach(edge => {
    store.edges.set(edge.id, edge);
    
    // Update edge index
    if (!store.nodeEdgeIndex.outgoing.has(edge.from)) {
      store.nodeEdgeIndex.outgoing.set(edge.from, new Set());
    }
    store.nodeEdgeIndex.outgoing.get(edge.from)!.add(edge.id);
    
    if (!store.nodeEdgeIndex.incoming.has(edge.to)) {
      store.nodeEdgeIndex.incoming.set(edge.to, new Set());
    }
    store.nodeEdgeIndex.incoming.get(edge.to)!.add(edge.id);
  });
  
  // Trigger a state update
  useGraphStore.setState({
    nodes: new Map(store.nodes),
    edges: new Map(store.edges),
    nodeEdgeIndex: {
      outgoing: new Map(store.nodeEdgeIndex.outgoing),
      incoming: new Map(store.nodeEdgeIndex.incoming),
    },
  });
}

// =============================================================================
// AUTO-SAVE ON CHANGES
// =============================================================================

/**
 * Save current graph state to localStorage
 */
export function saveToStorage(): void {
  const store = useGraphStore.getState();
  const nodes = store.getAllNodes();
  const edges = store.getAllEdges();
  
  CSVService.saveNodesToStorage(nodes);
  CSVService.saveEdgesToStorage(edges);
}

/**
 * Subscribe to store changes and auto-save
 */
let unsubscribe: (() => void) | null = null;

export function enableAutoSave(): void {
  if (unsubscribe) return; // Already subscribed
  
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  
  unsubscribe = useGraphStore.subscribe(() => {
    // Debounce saves to avoid excessive writes
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(() => {
      saveToStorage();
      console.log('[CSV] Auto-saved to localStorage');
    }, 500); // 500ms debounce
  });
}

export function disableAutoSave(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// =============================================================================
// EXPORT/IMPORT
// =============================================================================

/**
 * Export current graph to CSV files (triggers download)
 */
export function exportToCSVFiles(): void {
  const store = useGraphStore.getState();
  const nodes = store.getAllNodes();
  const edges = store.getAllEdges();
  
  const timestamp = new Date().toISOString().slice(0, 10);
  
  CSVService.downloadNodesCSV(nodes, `ideograph-nodes-${timestamp}.csv`);
  CSVService.downloadEdgesCSV(edges, `ideograph-edges-${timestamp}.csv`);
}

/**
 * Import graph from CSV files (from file input)
 */
export async function importFromCSVFiles(
  nodesFile: File,
  edgesFile?: File
): Promise<{ nodesLoaded: number; edgesLoaded: number }> {
  const nodes = await CSVService.importNodesFromFile(nodesFile);
  const edges = edgesFile 
    ? await CSVService.importEdgesFromFile(edgesFile)
    : [];
  
  importToStore(nodes, edges);
  
  // Save to localStorage
  CSVService.saveNodesToStorage(nodes);
  if (edges.length > 0) {
    CSVService.saveEdgesToStorage(edges);
  }
  
  return {
    nodesLoaded: nodes.length,
    edgesLoaded: edges.length,
  };
}

// =============================================================================
// RESET
// =============================================================================

/**
 * Reset to default CSV data (clears localStorage and reloads from files)
 */
export async function resetToDefaultCSV(): Promise<void> {
  CSVService.clearStorage();
  isInitialized = false;
  await initializeFromCSV();
}

/**
 * Clear all data (including localStorage)
 */
export function clearAllData(): void {
  CSVService.clearStorage();
  useGraphStore.getState().clear();
  isInitialized = false;
}

// =============================================================================
// STATUS
// =============================================================================

/**
 * Check if CSV data has been initialized
 */
export function isCSVInitialized(): boolean {
  return isInitialized;
}

/**
 * Get last modified timestamp
 */
export function getLastModified(): Date | null {
  return CSVService.getLastModified();
}

/**
 * Get current graph statistics
 */
export function getGraphStats(): {
  nodeCount: number;
  edgeCount: number;
  lastModified: Date | null;
  storageUsed: string;
} {
  const store = useGraphStore.getState();
  const nodesCSV = localStorage.getItem('ideograph_nodes_csv') || '';
  const edgesCSV = localStorage.getItem('ideograph_edges_csv') || '';
  const storageBytes = new Blob([nodesCSV, edgesCSV]).size;
  
  return {
    nodeCount: store.nodes.size,
    edgeCount: store.edges.size,
    lastModified: getLastModified(),
    storageUsed: `${(storageBytes / 1024).toFixed(1)} KB`,
  };
}
