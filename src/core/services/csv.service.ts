/**
 * CSV Persistence Service
 * 
 * Handles reading and writing graph data to CSV format.
 * Uses localStorage for persistence and provides import/export functionality.
 */

import type { 
  GraphNode, 
  GraphEdge, 
  FrameworkNode, 
  ClaimNode, 
  FactNode, 
  EvidenceNode,
  NodeType,
  EdgeType,
  FrameworkCategory,
} from '../../types/graph';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEYS = {
  NODES: 'ideograph_nodes_csv',
  EDGES: 'ideograph_edges_csv',
  LAST_MODIFIED: 'ideograph_last_modified',
};

// CSV column headers
const NODE_HEADERS = [
  'id', 'type', 'title', 'content', 'confidence', 
  'createdAt', 'updatedAt', 'source', 'tested',
  'valence', 'frameworkCategory', 'description', 'isSkeleton',
  'parentId', 'positionX', 'positionY', 'positionLevel'
];

const EDGE_HEADERS = [
  'id', 'type', 'from', 'to', 'note', 'createdAt'
];

// =============================================================================
// CSV PARSING UTILITIES
// =============================================================================

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// parseCSVValue is handled inline in parseCSVLine

/**
 * Parse a CSV line into values (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  values.push(current);
  
  return values;
}

// =============================================================================
// NODE SERIALIZATION
// =============================================================================

/**
 * Convert a node to a CSV row
 */
function nodeToCSVRow(node: GraphNode): string {
  const values = [
    node.id,
    node.type,
    node.title,
    node.content,
    node.confidence,
    node.createdAt instanceof Date ? node.createdAt.toISOString() : node.createdAt,
    node.updatedAt instanceof Date ? node.updatedAt.toISOString() : node.updatedAt,
    // Type-specific fields
    (node as ClaimNode | FactNode | EvidenceNode).source || '',
    (node as ClaimNode).tested !== undefined ? (node as ClaimNode).tested : '',
    (node as EvidenceNode).valence || '',
    (node as FrameworkNode).frameworkCategory || '',
    (node as FrameworkNode).description || '',
    (node as FrameworkNode).isSkeleton !== undefined ? (node as FrameworkNode).isSkeleton : '',
    (node as FrameworkNode).parentId || '',
    (node as FrameworkNode).position?.x ?? '',
    (node as FrameworkNode).position?.y ?? '',
    (node as FrameworkNode).position?.level ?? '',
  ];
  
  return values.map(escapeCSV).join(',');
}

/**
 * Parse a CSV row into a node
 */
function csvRowToNode(headers: string[], values: string[]): GraphNode {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] || '';
  });
  
  const baseNode = {
    id: obj.id,
    type: obj.type as NodeType,
    title: obj.title,
    content: obj.content,
    confidence: parseInt(obj.confidence) || 50,
    createdAt: obj.createdAt ? new Date(obj.createdAt) : new Date(),
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt) : new Date(),
    versions: [],
  };
  
  switch (obj.type) {
    case 'framework':
      return {
        ...baseNode,
        type: 'framework',
        frameworkCategory: (obj.frameworkCategory || undefined) as FrameworkCategory | undefined,
        description: obj.description || '',
        isSkeleton: obj.isSkeleton === 'true',
        parentId: obj.parentId || undefined,
        position: obj.positionX ? {
          x: parseFloat(obj.positionX),
          y: parseFloat(obj.positionY),
          level: parseInt(obj.positionLevel),
        } : undefined,
      } as FrameworkNode;
      
    case 'claim':
      return {
        ...baseNode,
        type: 'claim',
        source: obj.source || undefined,
        tested: obj.tested === 'true',
      } as ClaimNode;
      
    case 'fact':
      return {
        ...baseNode,
        type: 'fact',
        source: obj.source || undefined,
      } as FactNode;
      
    case 'evidence':
      return {
        ...baseNode,
        type: 'evidence',
        source: obj.source || '',
        valence: (obj.valence || 'supporting') as 'supporting' | 'contradicting',
      } as EvidenceNode;
      
    default:
      return baseNode as GraphNode;
  }
}

// =============================================================================
// EDGE SERIALIZATION
// =============================================================================

/**
 * Convert an edge to a CSV row
 */
function edgeToCSVRow(edge: GraphEdge): string {
  const values = [
    edge.id,
    edge.type,
    edge.from,
    edge.to,
    edge.note || '',
    edge.createdAt instanceof Date ? edge.createdAt.toISOString() : edge.createdAt,
  ];
  
  return values.map(escapeCSV).join(',');
}

/**
 * Parse a CSV row into an edge
 */
function csvRowToEdge(headers: string[], values: string[]): GraphEdge {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] || '';
  });
  
  return {
    id: obj.id,
    type: obj.type as EdgeType,
    from: obj.from,
    to: obj.to,
    note: obj.note || undefined,
    createdAt: obj.createdAt ? new Date(obj.createdAt) : new Date(),
  };
}

// =============================================================================
// CSV SERVICE
// =============================================================================

export class CSVService {
  /**
   * Convert nodes array to CSV string
   */
  static nodesToCSV(nodes: GraphNode[]): string {
    const lines = [NODE_HEADERS.join(',')];
    nodes.forEach(node => {
      lines.push(nodeToCSVRow(node));
    });
    return lines.join('\n');
  }
  
  /**
   * Convert edges array to CSV string
   */
  static edgesToCSV(edges: GraphEdge[]): string {
    const lines = [EDGE_HEADERS.join(',')];
    edges.forEach(edge => {
      lines.push(edgeToCSVRow(edge));
    });
    return lines.join('\n');
  }
  
  /**
   * Parse CSV string into nodes array
   */
  static csvToNodes(csv: string): GraphNode[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const nodes: GraphNode[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      try {
        const node = csvRowToNode(headers, values);
        nodes.push(node);
      } catch (e) {
        console.error(`Error parsing node at line ${i + 1}:`, e);
      }
    }
    
    return nodes;
  }
  
  /**
   * Parse CSV string into edges array
   */
  static csvToEdges(csv: string): GraphEdge[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const edges: GraphEdge[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      try {
        const edge = csvRowToEdge(headers, values);
        edges.push(edge);
      } catch (e) {
        console.error(`Error parsing edge at line ${i + 1}:`, e);
      }
    }
    
    return edges;
  }
  
  // ===========================================================================
  // LOCALSTORAGE PERSISTENCE
  // ===========================================================================
  
  /**
   * Save nodes to localStorage
   */
  static saveNodesToStorage(nodes: GraphNode[]): void {
    const csv = this.nodesToCSV(nodes);
    localStorage.setItem(STORAGE_KEYS.NODES, csv);
    localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, new Date().toISOString());
  }
  
  /**
   * Save edges to localStorage
   */
  static saveEdgesToStorage(edges: GraphEdge[]): void {
    const csv = this.edgesToCSV(edges);
    localStorage.setItem(STORAGE_KEYS.EDGES, csv);
    localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, new Date().toISOString());
  }
  
  /**
   * Load nodes from localStorage
   */
  static loadNodesFromStorage(): GraphNode[] | null {
    const csv = localStorage.getItem(STORAGE_KEYS.NODES);
    if (!csv) return null;
    return this.csvToNodes(csv);
  }
  
  /**
   * Load edges from localStorage
   */
  static loadEdgesFromStorage(): GraphEdge[] | null {
    const csv = localStorage.getItem(STORAGE_KEYS.EDGES);
    if (!csv) return null;
    return this.csvToEdges(csv);
  }
  
  /**
   * Check if data exists in storage
   */
  static hasStoredData(): boolean {
    return localStorage.getItem(STORAGE_KEYS.NODES) !== null;
  }
  
  /**
   * Clear all stored data
   */
  static clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.NODES);
    localStorage.removeItem(STORAGE_KEYS.EDGES);
    localStorage.removeItem(STORAGE_KEYS.LAST_MODIFIED);
  }
  
  /**
   * Get last modified timestamp
   */
  static getLastModified(): Date | null {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_MODIFIED);
    return timestamp ? new Date(timestamp) : null;
  }
  
  // ===========================================================================
  // FILE OPERATIONS
  // ===========================================================================
  
  /**
   * Load nodes from a CSV file (via fetch)
   */
  static async loadNodesFromFile(url: string): Promise<GraphNode[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load nodes from ${url}`);
    }
    const csv = await response.text();
    return this.csvToNodes(csv);
  }
  
  /**
   * Load edges from a CSV file (via fetch)
   */
  static async loadEdgesFromFile(url: string): Promise<GraphEdge[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load edges from ${url}`);
    }
    const csv = await response.text();
    return this.csvToEdges(csv);
  }
  
  /**
   * Download nodes as a CSV file
   */
  static downloadNodesCSV(nodes: GraphNode[], filename: string = 'nodes.csv'): void {
    const csv = this.nodesToCSV(nodes);
    this.downloadFile(csv, filename, 'text/csv');
  }
  
  /**
   * Download edges as a CSV file
   */
  static downloadEdgesCSV(edges: GraphEdge[], filename: string = 'edges.csv'): void {
    const csv = this.edgesToCSV(edges);
    this.downloadFile(csv, filename, 'text/csv');
  }
  
  /**
   * Trigger a file download
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Import nodes from a file input
   */
  static importNodesFromFile(file: File): Promise<GraphNode[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const nodes = this.csvToNodes(csv);
          resolve(nodes);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
  
  /**
   * Import edges from a file input
   */
  static importEdgesFromFile(file: File): Promise<GraphEdge[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const edges = this.csvToEdges(csv);
          resolve(edges);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

export default CSVService;
