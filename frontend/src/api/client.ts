/**
 * API Client
 * Handles all communication with the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  title: string;
  content: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  // Framework-specific
  framework_category?: string;
  description?: string;
  position?: { x: number; y: number; level: number };
  is_skeleton?: boolean;
  parent_id?: string;
  // Claim-specific
  source?: string;
  tested?: boolean;
  // Evidence-specific
  valence?: string;
}

export interface GraphEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  note?: string;
  created_at: string;
}

export interface CreateNodeInput {
  type: string;
  title: string;
  content?: string;
  confidence?: number;
  framework_category?: string;
  description?: string;
  position?: { x: number; y: number; level: number };
  is_skeleton?: boolean;
  parent_id?: string;
  source?: string;
  tested?: boolean;
  valence?: string;
}

export interface CreateEdgeInput {
  type: string;
  from: string;
  to: string;
  note?: string;
}

export interface UpdateNodeInput {
  title?: string;
  content?: string;
  confidence?: number;
}

export interface Progress {
  answered: number;
  total: number;
  percentage: number;
}

// =============================================================================
// EXTRACTION TYPES
// =============================================================================

export interface ExtractionOperation {
  op: 'add_node' | 'add_edge';
  node?: {
    id: string;
    type: string;
    label: string;
    title: string;
    content: string;
    confidence: number;
    source?: string;
    created_at: string;
    position: null;
  };
  edge?: {
    id: string;
    source_id: string;
    target_id: string;
    type: string;
    reason?: string;
    created_at: string;
  };
}

export interface ExtractedNode {
  type: string;
  label: string;
  content: string;
  confidence: number;
  source?: string;
  framework_connections: Array<{
    framework_id: string;
    edge_type: string;
    reason: string;
  }>;
}

export interface FollowUpQuestion {
  question: string;
  type: 'validation' | 'quantitative' | 'customer' | 'risk';
  context: string;
  targets_node?: string;
  framework_category?: string;
}

// =============================================================================
// GAP ANALYSIS TYPES
// =============================================================================

export interface Gap {
  framework_id: string;
  question: string;
  why_it_matters: string;
  criticality: 'killer' | 'high' | 'medium' | 'low';
  founder_trap: string;
  probing_questions: string[];
  coverage_score: number;
  connected_nodes_count: number;
}

export interface PriorityAction {
  framework_id: string;
  action: string;
  criticality: string;
  why: string;
}

export interface GapSummary {
  total_gaps: number;
  killer_gaps: number;
  high_gaps: number;
  medium_gaps: number;
  low_gaps: number;
  most_critical: Gap | null;
  priority_actions: PriorityAction[];
  overall_readiness: 'critical_gaps' | 'needs_work' | 'in_progress' | 'good' | 'complete';
  completion_percentage: number;
}

export interface GapAnalysisResponse {
  success: boolean;
  summary: GapSummary;
  gaps: Gap[];
  category_breakdown: Record<string, {
    total_questions: number;
    gaps_count: number;
    completion_percentage: number;
  }>;
}

export interface CategoryGapsResponse {
  category: string;
  total_questions: number;
  gaps_count: number;
  completion_percentage: number;
  gaps: Gap[];
}

export interface GapAnalysisBrief {
  summary: {
    total_gaps: number;
    killer_gaps: number;
    high_gaps: number;
    overall_readiness: string;
    completion_percentage: number;
  };
  top_gaps: Array<{
    framework_id: string;
    question: string;
    criticality: string;
    coverage_score: number;
    probing_questions: string[];
  }>;
  priority_actions: PriorityAction[];
}

export interface FrameworkQuestion {
  id: string;
  question: string;
  why_it_matters: string;
  criticality: string;
  founder_trap: string;
  probing_questions: string[];
}

// =============================================================================
// PMF PATH TYPES
// =============================================================================

export interface PathPlaybookSummary {
  path: string;
  name: string;
  icon: string;
  tagline: string;
  enemy: string;
  job: string;
  speed_matters: string;
  benchmark: {
    company: string;
    description: string;
  };
  this_week_actions: string[];
  warning_count: number;
  rule_count: number;
}

export interface PathPlaybookRule {
  id: string;
  path: string;
  title: string;
  message: string;
  severity: 'blocker' | 'warning' | 'info';
  action_label: string;
  action_type: string;
  condition_description: string;
  triggered?: boolean;
}

export interface PathPlaybookMetric {
  id: string;
  name: string;
  description: string;
  target: string;
}

export interface PathPlaybookWarning {
  id: string;
  title: string;
  description: string;
}

export interface PathPlaybook {
  path: string;
  name: string;
  icon: string;
  tagline: string;
  enemy: string;
  job: string;
  speed_matters: string;
  benchmark: {
    company: string;
    description: string;
  };
  rules: PathPlaybookRule[];
  metrics: PathPlaybookMetric[];
  warnings: PathPlaybookWarning[];
  this_week_actions: string[];
}

export interface PathStatus {
  path: string | null;
  playbook: PathPlaybookSummary | null;
  status: 'no_path' | 'blockers_present' | 'warnings_present' | 'on_track';
  message: string;
  blockers: PathPlaybookRule[];
  warnings: PathPlaybookRule[];
  triggered_rules: PathPlaybookRule[];
  total_rules: number;
  triggered_count: number;
}

export interface ExtractionResponse {
  operations: ExtractionOperation[];
  reasoning: string;
  raw_nodes: ExtractedNode[];
  followup_questions?: FollowUpQuestion[];
  followup_summary?: string;
  gap_analysis?: GapAnalysisBrief;
  applied?: {
    nodes_added: GraphNode[];
    edges_added: GraphEdge[];
    errors: Array<{ operation: ExtractionOperation; error: string }>;
  };
}

// =============================================================================
// API CLIENT
// =============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { error: error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // ===========================================================================
  // GRAPH STATE
  // ===========================================================================

  async getGraphState(): Promise<ApiResponse<GraphState>> {
    return this.fetch<GraphState>('/api/graph/state');
  }

  async getProgress(): Promise<ApiResponse<Progress>> {
    return this.fetch<Progress>('/api/graph/progress');
  }

  // ===========================================================================
  // NODE OPERATIONS
  // ===========================================================================

  async getAllNodes(): Promise<ApiResponse<GraphNode[]>> {
    return this.fetch<GraphNode[]>('/api/graph/nodes');
  }

  async getNode(nodeId: string): Promise<ApiResponse<GraphNode>> {
    return this.fetch<GraphNode>(`/api/graph/nodes/${nodeId}`);
  }

  async getNodesByType(nodeType: string): Promise<ApiResponse<GraphNode[]>> {
    return this.fetch<GraphNode[]>(`/api/graph/nodes/type/${nodeType}`);
  }

  async getFrameworkNodes(): Promise<ApiResponse<GraphNode[]>> {
    return this.fetch<GraphNode[]>('/api/graph/framework-nodes');
  }

  async createNode(input: CreateNodeInput): Promise<ApiResponse<{ success: boolean; node?: GraphNode; message?: string }>> {
    return this.fetch('/api/graph/nodes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateNode(nodeId: string, updates: UpdateNodeInput): Promise<ApiResponse<{ success: boolean; node?: GraphNode }>> {
    return this.fetch(`/api/graph/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNode(nodeId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.fetch(`/api/graph/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // EDGE OPERATIONS
  // ===========================================================================

  async getAllEdges(): Promise<ApiResponse<GraphEdge[]>> {
    return this.fetch<GraphEdge[]>('/api/graph/edges');
  }

  async getEdge(edgeId: string): Promise<ApiResponse<GraphEdge>> {
    return this.fetch<GraphEdge>(`/api/graph/edges/${edgeId}`);
  }

  async createEdge(input: CreateEdgeInput): Promise<ApiResponse<{ success: boolean; edge?: GraphEdge; message?: string }>> {
    return this.fetch('/api/graph/edges', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteEdge(edgeId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.fetch(`/api/graph/edges/${edgeId}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // GRAPH TRAVERSAL
  // ===========================================================================

  async getConnectedNodes(nodeId: string): Promise<ApiResponse<Array<{ node: GraphNode; edge: GraphEdge; direction: string }>>> {
    return this.fetch(`/api/graph/nodes/${nodeId}/connected`);
  }

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  async exportNodesCSV(): Promise<void> {
    window.open(`${this.baseUrl}/api/graph/export/nodes.csv`, '_blank');
  }

  async exportEdgesCSV(): Promise<void> {
    window.open(`${this.baseUrl}/api/graph/export/edges.csv`, '_blank');
  }

  exportAllCSV(): void {
    this.exportNodesCSV();
    this.exportEdgesCSV();
  }

  // ===========================================================================
  // EXTRACTION (AI Agent)
  // ===========================================================================

  async extractFromText(
    text: string,
    applyToGraph: boolean = false,
    model?: string
  ): Promise<ApiResponse<ExtractionResponse>> {
    return this.fetch<ExtractionResponse>('/api/agent/extract', {
      method: 'POST',
      body: JSON.stringify({
        text,
        apply_to_graph: applyToGraph,
        model,
      }),
    });
  }

  async applyExtractionOperations(
    operations: ExtractionOperation[]
  ): Promise<ApiResponse<{ success: boolean; applied: any }>> {
    return this.fetch('/api/agent/extract/apply', {
      method: 'POST',
      body: JSON.stringify(operations),
    });
  }

  // ===========================================================================
  // GAP ANALYSIS
  // ===========================================================================

  /**
   * Analyze the knowledge graph for gaps in framework coverage.
   * Returns prioritized list of unanswered/underaddressed questions.
   * 
   * @param threshold - Coverage score below which a question is considered a gap (default 0.5)
   * @param categories - Optional list of categories to filter by (e.g., ['problem', 'market'])
   */
  async analyzeGaps(
    threshold: number = 0.5,
    categories?: string[]
  ): Promise<ApiResponse<GapAnalysisResponse>> {
    return this.fetch<GapAnalysisResponse>('/api/agent/analyze-gaps', {
      method: 'POST',
      body: JSON.stringify({ threshold, categories }),
    });
  }

  /**
   * Get gap analysis for a specific category.
   * Categories: market, problem, solution, timing, founder, competition, business_model, gtm
   */
  async analyzeCategoryGaps(
    category: string,
    threshold: number = 0.5
  ): Promise<ApiResponse<CategoryGapsResponse>> {
    return this.fetch<CategoryGapsResponse>(
      `/api/agent/analyze-gaps/${category}?threshold=${threshold}`
    );
  }

  /**
   * List all framework questions with their metadata.
   * Useful for understanding what information the system is looking for.
   */
  async getFrameworkQuestions(): Promise<ApiResponse<{
    total_questions: number;
    questions: FrameworkQuestion[];
  }>> {
    return this.fetch('/api/agent/framework-questions');
  }

  // ===========================================================================
  // PMF PATH
  // ===========================================================================

  /**
   * Set the PMF path for the startup.
   * Creates or updates the startup_meta node with the selected path.
   */
  async setPath(
    path: 'hair_on_fire' | 'hard_fact' | 'future_vision',
    confidence: number = 100
  ): Promise<ApiResponse<{
    success: boolean;
    path: string;
    confidence: number;
    meta_node_id: string;
    playbook: PathPlaybookSummary;
    message: string;
  }>> {
    return this.fetch('/api/agent/path/set', {
      method: 'POST',
      body: JSON.stringify({ path, confidence }),
    });
  }

  /**
   * Get the current PMF path status, including triggered playbook rules.
   */
  async getPathStatus(): Promise<ApiResponse<PathStatus>> {
    return this.fetch('/api/agent/path/status');
  }

  /**
   * Get the full playbook for a specific PMF path.
   */
  async getPlaybook(
    path: 'hair_on_fire' | 'hard_fact' | 'future_vision'
  ): Promise<ApiResponse<PathPlaybook>> {
    return this.fetch(`/api/agent/path/playbook/${path}`);
  }

  /**
   * List all available PMF path playbooks with summaries.
   */
  async listPlaybooks(): Promise<ApiResponse<{
    paths: Array<{
      id: string;
      summary: PathPlaybookSummary;
    }>;
  }>> {
    return this.fetch('/api/agent/path/playbooks');
  }

  /**
   * Auto-detect the likely PMF path based on the current graph content.
   */
  async detectPath(): Promise<ApiResponse<{
    detected_path: string | null;
    confidence: number;
    scores: Record<string, number>;
    playbook_summary: PathPlaybookSummary | null;
    message: string;
  }>> {
    return this.fetch('/api/agent/path/detect', { method: 'POST' });
  }

  /**
   * Get gaps specific to a PMF path.
   */
  async getPathGaps(
    path: 'hair_on_fire' | 'hard_fact' | 'future_vision',
    threshold: number = 0.5
  ): Promise<ApiResponse<{
    path: string;
    total_path_questions: number;
    gaps_count: number;
    gaps: any[];
  }>> {
    return this.fetch(`/api/agent/path/gaps/${path}?threshold=${threshold}`);
  }
}

// Singleton instance
export const api = new ApiClient();

export default api;
