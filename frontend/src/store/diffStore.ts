/**
 * Diff Store - State management for the Diff UI
 * Manages proposed changes, their statuses, and applying them to the graph
 */

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { ProposedChange, ChangeType } from '../pipeline/types';
import type { GraphNode, ClaimNode, FactNode, EvidenceNode } from '../types/graph';
import { useGraphStore } from './graphStore';
import { api } from '../api';

// =============================================================================
// TYPES
// =============================================================================

export type ChangeStatus = 'pending' | 'accepted' | 'rejected' | 'editing';

export type HighlightType = 'update' | 'add' | 'connect' | 'contradict' | 'strengthen' | 'weaken';

interface DiffState {
  // State
  isOpen: boolean;
  originalInput: string;
  proposedChanges: ProposedChange[];
  changeStatuses: Record<string, ChangeStatus>;
  editedChanges: Record<string, ProposedChange>;
  focusedChangeId: string | null;
  
  // Computed
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  
  // Actions
  openDiff: (input: string, changes: ProposedChange[]) => void;
  closeDiff: () => void;
  acceptChange: (id: string) => void;
  rejectChange: (id: string) => void;
  resetChange: (id: string) => void;
  editChange: (id: string, edited: ProposedChange) => void;
  startEditing: (id: string) => void;
  cancelEditing: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  resetAll: () => void;
  applyAccepted: () => ApplyResult;
  setFocusedChange: (id: string | null) => void;
  focusNext: () => void;
  focusPrevious: () => void;
  answerQuestion: (id: string, answer: string) => void;
  markUnsure: (id: string) => void;
  
  // Helpers
  getHighlightedNodes: () => Record<string, HighlightType>;
  getChangesByType: (type: ChangeType) => ProposedChange[];
  getChangesByStatus: (status: ChangeStatus) => ProposedChange[];
}

export interface ApplyResult {
  applied: string[];
  failed: { id: string; error: string }[];
}

// =============================================================================
// STORE
// =============================================================================

export const useDiffStore = create<DiffState>((set, get) => ({
  // Initial state
  isOpen: false,
  originalInput: '',
  proposedChanges: [],
  changeStatuses: {},
  editedChanges: {},
  focusedChangeId: null,
  
  // Computed (updated via actions)
  pendingCount: 0,
  acceptedCount: 0,
  rejectedCount: 0,
  
  // Open diff panel with new changes
  openDiff: (input, changes) => {
    const statuses: Record<string, ChangeStatus> = {};
    changes.forEach(c => {
      statuses[c.id] = 'pending';
    });
    
    set({
      isOpen: true,
      originalInput: input,
      proposedChanges: changes,
      changeStatuses: statuses,
      editedChanges: {},
      focusedChangeId: changes.length > 0 ? changes[0].id : null,
      pendingCount: changes.length,
      acceptedCount: 0,
      rejectedCount: 0,
    });
  },
  
  // Close diff panel
  closeDiff: () => {
    set({
      isOpen: false,
      originalInput: '',
      proposedChanges: [],
      changeStatuses: {},
      editedChanges: {},
      focusedChangeId: null,
      pendingCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
    });
  },
  
  // Accept a change
  acceptChange: (id) => {
    const { changeStatuses } = get();
    const prevStatus = changeStatuses[id];
    
    set(state => {
      const newStatuses = { ...state.changeStatuses, [id]: 'accepted' as ChangeStatus };
      return {
        changeStatuses: newStatuses,
        pendingCount: state.pendingCount - (prevStatus === 'pending' ? 1 : 0),
        acceptedCount: state.acceptedCount + (prevStatus !== 'accepted' ? 1 : 0),
        rejectedCount: state.rejectedCount - (prevStatus === 'rejected' ? 1 : 0),
      };
    });
  },
  
  // Reject a change
  rejectChange: (id) => {
    const { changeStatuses } = get();
    const prevStatus = changeStatuses[id];
    
    set(state => {
      const newStatuses = { ...state.changeStatuses, [id]: 'rejected' as ChangeStatus };
      return {
        changeStatuses: newStatuses,
        pendingCount: state.pendingCount - (prevStatus === 'pending' ? 1 : 0),
        acceptedCount: state.acceptedCount - (prevStatus === 'accepted' ? 1 : 0),
        rejectedCount: state.rejectedCount + (prevStatus !== 'rejected' ? 1 : 0),
      };
    });
  },
  
  // Reset a change to pending
  resetChange: (id) => {
    const { changeStatuses } = get();
    const prevStatus = changeStatuses[id];
    
    set(state => {
      const newStatuses = { ...state.changeStatuses, [id]: 'pending' as ChangeStatus };
      return {
        changeStatuses: newStatuses,
        pendingCount: state.pendingCount + (prevStatus !== 'pending' ? 1 : 0),
        acceptedCount: state.acceptedCount - (prevStatus === 'accepted' ? 1 : 0),
        rejectedCount: state.rejectedCount - (prevStatus === 'rejected' ? 1 : 0),
      };
    });
  },
  
  // Save edited change
  editChange: (id, edited) => {
    set(state => ({
      editedChanges: { ...state.editedChanges, [id]: edited },
      changeStatuses: { ...state.changeStatuses, [id]: 'pending' as ChangeStatus },
    }));
  },
  
  // Start editing a change
  startEditing: (id) => {
    set(state => ({
      changeStatuses: { ...state.changeStatuses, [id]: 'editing' as ChangeStatus },
    }));
  },
  
  // Cancel editing
  cancelEditing: (id) => {
    set(state => ({
      changeStatuses: { ...state.changeStatuses, [id]: 'pending' as ChangeStatus },
    }));
  },
  
  // Accept all pending changes
  acceptAll: () => {
    const { proposedChanges, changeStatuses } = get();
    const newStatuses: Record<string, ChangeStatus> = {};
    
    proposedChanges.forEach(c => {
      newStatuses[c.id] = changeStatuses[c.id] === 'editing' ? 'editing' : 'accepted';
    });
    
    const acceptedCount = Object.values(newStatuses).filter(s => s === 'accepted').length;
    
    set({
      changeStatuses: newStatuses,
      pendingCount: 0,
      acceptedCount,
      rejectedCount: 0,
    });
  },
  
  // Reject all pending changes
  rejectAll: () => {
    const { proposedChanges, changeStatuses } = get();
    const newStatuses: Record<string, ChangeStatus> = {};
    
    proposedChanges.forEach(c => {
      newStatuses[c.id] = changeStatuses[c.id] === 'editing' ? 'editing' : 'rejected';
    });
    
    const rejectedCount = Object.values(newStatuses).filter(s => s === 'rejected').length;
    
    set({
      changeStatuses: newStatuses,
      pendingCount: 0,
      acceptedCount: 0,
      rejectedCount,
    });
  },
  
  // Reset all changes to pending
  resetAll: () => {
    const { proposedChanges } = get();
    const newStatuses: Record<string, ChangeStatus> = {};
    
    proposedChanges.forEach(c => {
      newStatuses[c.id] = 'pending';
    });
    
    set({
      changeStatuses: newStatuses,
      editedChanges: {},
      pendingCount: proposedChanges.length,
      acceptedCount: 0,
      rejectedCount: 0,
    });
  },
  
  // Apply all accepted changes to the graph via backend API
  applyAccepted: () => {
    const { proposedChanges, changeStatuses, editedChanges } = get();
    const results: ApplyResult = { applied: [], failed: [] };
    
    // Collect changes to apply via API
    const changesToApply: Array<{
      change: ProposedChange;
      nodeData?: { type: string; title: string; content: string; confidence: number; source?: string };
      edges?: Array<{ type: string; to: string; note?: string }>;
    }> = [];
    
    for (const change of proposedChanges) {
      if (changeStatuses[change.id] !== 'accepted') continue;
      
      // Use edited version if exists
      const finalChange = editedChanges[change.id] || change;
      
      if (finalChange.type === 'ADD' && finalChange.newNode) {
        changesToApply.push({
          change: finalChange,
          nodeData: {
            type: finalChange.newNode.type,
            title: finalChange.newNode.title,
            content: finalChange.newNode.content,
            confidence: finalChange.newNode.confidence,
          },
          edges: finalChange.connectTo?.map(conn => ({
            type: conn.edgeType,
            to: conn.nodeId,
          })),
        });
      }
      
      // Handle SUGGEST (follow-up questions)
      if (finalChange.type === 'SUGGEST' && finalChange.suggestion) {
        // Parse sourceText to get metadata
        let metadata: any = {};
        try {
          metadata = JSON.parse(finalChange.sourceText || '{}');
        } catch {
          // sourceText is not JSON, ignore
        }
        
        const frameworkCategory = metadata.frameworkCategory;
        
        if (metadata.isAnswered && metadata.answer) {
          // User provided an answer - we'll process it via extraction API
          changesToApply.push({
            change: finalChange,
            nodeData: undefined, // Will be handled separately via extraction
            answerToExtract: {
              question: finalChange.suggestion,
              answer: metadata.answer,
              frameworkCategory,
            },
          });
        } else if (metadata.isBlocker) {
          // User marked as "Not Sure" - create a blocker claim
          changesToApply.push({
            change: finalChange,
            nodeData: {
              type: 'claim',
              title: `[BLOCKER] ${finalChange.suggestion.substring(0, 40)}${finalChange.suggestion.length > 40 ? '...' : ''}`,
              content: `⚠️ BLOCKER: Need to find out\n\nQuestion: ${finalChange.suggestion}\n\nContext: ${finalChange.rationale || 'Generated from extraction'}`,
              confidence: 10, // Very low confidence - unknown
            },
            edges: frameworkCategory ? [{
              type: 'blocks', // This blocks the framework category
              to: frameworkCategory.startsWith('framework:') ? frameworkCategory : `framework:${frameworkCategory}`,
            }] : undefined,
          });
        } else {
          // Default case - just add question as a claim
          changesToApply.push({
            change: finalChange,
            nodeData: {
              type: 'claim',
              title: `[Question] ${finalChange.suggestion.substring(0, 50)}${finalChange.suggestion.length > 50 ? '...' : ''}`,
              content: `Follow-up question: ${finalChange.suggestion}\n\nContext: ${finalChange.rationale || 'Generated from extraction'}`,
              confidence: 20,
            },
            edges: frameworkCategory ? [{
              type: 'informs',
              to: frameworkCategory.startsWith('framework:') ? frameworkCategory : `framework:${frameworkCategory}`,
            }] : undefined,
          });
        }
      }
    }
    
    // Apply via backend API (async but we close the panel immediately)
    if (changesToApply.length > 0) {
      (async () => {
        for (const item of changesToApply) {
          try {
            // Handle answered questions - extract from the answer
            if ((item as any).answerToExtract) {
              const answerData = (item as any).answerToExtract;
              const answerText = `Q: ${answerData.question}\nA: ${answerData.answer}`;
              
              // Call extraction API to parse the answer
              const extractResponse = await api.extractFromText(answerText, true);
              if (extractResponse.data) {
                results.applied.push(item.change.id);
                console.log(`[DiffStore] Extracted from answer: ${extractResponse.data.raw_nodes?.length || 0} nodes`);
              } else {
                results.failed.push({
                  id: item.change.id,
                  error: extractResponse.error || 'Failed to extract from answer'
                });
              }
              continue;
            }
            
            if (item.nodeData) {
              const response = await api.createNode(item.nodeData);
              if (response.data?.success && response.data.node) {
                const createdId = response.data.node.id;
                results.applied.push(item.change.id);
                
                // Create edges
                if (item.edges) {
                  for (const edge of item.edges) {
                    await api.createEdge({
                      type: edge.type,
                      from: createdId,
                      to: edge.to,
                      note: edge.note,
                    });
                  }
                }
                console.log(`[DiffStore] Created node: ${item.nodeData.title}`);
              } else {
                results.failed.push({
                  id: item.change.id,
                  error: response.error || 'Failed to create node'
                });
              }
            }
          } catch (e) {
            results.failed.push({
              id: item.change.id,
              error: e instanceof Error ? e.message : 'Unknown error'
            });
          }
        }
        
        // Refresh the API store to show new nodes
        const { useApiGraphStore } = await import('./apiGraphStore');
        await useApiGraphStore.getState().refresh();
        
        console.log(`[DiffStore] Applied ${results.applied.length} changes, ${results.failed.length} failed`);
      })();
    }
    
    // Close diff panel immediately (changes applied in background)
    get().closeDiff();
    
    return results;
  },
  
  // Focus management
  setFocusedChange: (id) => {
    set({ focusedChangeId: id });
  },
  
  focusNext: () => {
    const { proposedChanges, focusedChangeId } = get();
    if (proposedChanges.length === 0) return;
    
    const currentIndex = proposedChanges.findIndex(c => c.id === focusedChangeId);
    const nextIndex = (currentIndex + 1) % proposedChanges.length;
    set({ focusedChangeId: proposedChanges[nextIndex].id });
  },
  
  focusPrevious: () => {
    const { proposedChanges, focusedChangeId } = get();
    if (proposedChanges.length === 0) return;
    
    const currentIndex = proposedChanges.findIndex(c => c.id === focusedChangeId);
    const prevIndex = currentIndex <= 0 ? proposedChanges.length - 1 : currentIndex - 1;
    set({ focusedChangeId: proposedChanges[prevIndex].id });
  },
  
  // Answer a follow-up question - parse the answer and create new changes
  answerQuestion: (id, answer) => {
    const { proposedChanges, editedChanges, changeStatuses } = get();
    const change = proposedChanges.find(c => c.id === id);
    
    if (!change || change.type !== 'SUGGEST') return;
    
    // Update the change with the answer - transform it into an ADD change
    // The answer will be parsed when applied
    const updatedChange: ProposedChange = {
      ...change,
      // Store the answer in a way that applyAccepted can use
      sourceText: JSON.stringify({
        ...JSON.parse(change.sourceText || '{}'),
        answer: answer,
        isAnswered: true,
      }),
      explanation: `Answer: "${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}"`,
    };
    
    // Mark as accepted and store the edited version
    const newStatuses = { ...changeStatuses, [id]: 'accepted' as ChangeStatus };
    const newEdited = { ...editedChanges, [id]: updatedChange };
    
    set({
      changeStatuses: newStatuses,
      editedChanges: newEdited,
      pendingCount: Object.values(newStatuses).filter(s => s === 'pending').length,
      acceptedCount: Object.values(newStatuses).filter(s => s === 'accepted').length,
      rejectedCount: Object.values(newStatuses).filter(s => s === 'rejected').length,
    });
    
    console.log(`[DiffStore] Question answered: ${change.suggestion?.substring(0, 50)}...`);
  },
  
  // Mark a question as "Not Sure" - adds it as a blocker
  markUnsure: (id) => {
    const { proposedChanges, editedChanges, changeStatuses } = get();
    const change = proposedChanges.find(c => c.id === id);
    
    if (!change || change.type !== 'SUGGEST') return;
    
    // Transform the question into a blocker
    const updatedChange: ProposedChange = {
      ...change,
      sourceText: JSON.stringify({
        ...JSON.parse(change.sourceText || '{}'),
        isBlocker: true,
      }),
      explanation: `⚠️ BLOCKER: Need to find out - ${change.suggestion}`,
    };
    
    // Mark as accepted and store the edited version
    const newStatuses = { ...changeStatuses, [id]: 'accepted' as ChangeStatus };
    const newEdited = { ...editedChanges, [id]: updatedChange };
    
    set({
      changeStatuses: newStatuses,
      editedChanges: newEdited,
      pendingCount: Object.values(newStatuses).filter(s => s === 'pending').length,
      acceptedCount: Object.values(newStatuses).filter(s => s === 'accepted').length,
      rejectedCount: Object.values(newStatuses).filter(s => s === 'rejected').length,
    });
    
    console.log(`[DiffStore] Question marked as blocker: ${change.suggestion?.substring(0, 50)}...`);
  },
  
  // Get nodes to highlight in the 3D view
  getHighlightedNodes: () => {
    const { proposedChanges, changeStatuses } = get();
    const highlights: Record<string, HighlightType> = {};
    
    for (const change of proposedChanges) {
      // Only highlight pending or accepted changes
      const status = changeStatuses[change.id];
      if (status === 'rejected') continue;
      
      switch (change.type) {
        case 'UPDATE':
          if (change.targetNodeId) {
            highlights[change.targetNodeId] = 'update';
          }
          break;
          
        case 'ADD':
          // New nodes don't exist yet, but we can highlight where they'll connect
          change.connectTo?.forEach(conn => {
            if (!highlights[conn.nodeId]) {
              highlights[conn.nodeId] = 'add';
            }
          });
          break;
          
        case 'CONNECT':
          if (change.sourceNodeId) highlights[change.sourceNodeId] = 'connect';
          if (change.targetNodeId) highlights[change.targetNodeId] = 'connect';
          break;
          
        case 'STRENGTHEN':
          if (change.nodeId) highlights[change.nodeId] = 'strengthen';
          break;
          
        case 'WEAKEN':
          if (change.nodeId) highlights[change.nodeId] = 'weaken';
          break;
          
        case 'CONTRADICT':
          if (change.nodeAId) highlights[change.nodeAId] = 'contradict';
          if (change.nodeBId) highlights[change.nodeBId] = 'contradict';
          break;
      }
    }
    
    return highlights;
  },
  
  // Filter helpers
  getChangesByType: (type) => {
    return get().proposedChanges.filter(c => c.type === type);
  },
  
  getChangesByStatus: (status) => {
    const { proposedChanges, changeStatuses } = get();
    return proposedChanges.filter(c => changeStatuses[c.id] === status);
  },
}));

// =============================================================================
// APPLY CHANGE TO GRAPH
// =============================================================================

function applyChangeToGraph(
  change: ProposedChange,
  graphStore: ReturnType<typeof useGraphStore.getState>
): void {
  switch (change.type) {
    case 'ADD': {
      if (!change.newNode) {
        throw new Error('ADD change missing newNode');
      }
      
      // Create the new node
      const nodeId = uuid();
      const now = new Date();
      
      let newNode: GraphNode;
      
      switch (change.newNode.type) {
        case 'claim':
          newNode = {
            id: nodeId,
            type: 'claim',
            title: change.newNode.title,
            content: change.newNode.content,
            confidence: change.newNode.confidence,
            createdAt: now,
            updatedAt: now,
            versions: [],
            tested: false,
          } as ClaimNode;
          break;
          
        case 'fact':
          newNode = {
            id: nodeId,
            type: 'fact',
            title: change.newNode.title,
            content: change.newNode.content,
            confidence: change.newNode.confidence,
            createdAt: now,
            updatedAt: now,
            versions: [],
            verified: false,
          } as FactNode;
          break;
          
        case 'evidence':
        default:
          newNode = {
            id: nodeId,
            type: 'evidence',
            title: change.newNode.title,
            content: change.newNode.content,
            confidence: change.newNode.confidence,
            createdAt: now,
            updatedAt: now,
            versions: [],
            sourceType: 'interview',
            valence: 'supporting',
            source: 'user input',
          } as EvidenceNode;
          break;
      }
      
      graphStore.addNode(newNode);
      
      // Create connections
      change.connectTo?.forEach(conn => {
        graphStore.addEdge({
          id: uuid(),
          type: conn.edgeType,
          from: nodeId,
          to: conn.nodeId,
        });
      });
      break;
    }
    
    case 'UPDATE': {
      if (!change.targetNodeId || !change.newContent) {
        throw new Error('UPDATE change missing targetNodeId or newContent');
      }
      
      graphStore.updateNode(change.targetNodeId, {
        content: change.newContent,
      });
      break;
    }
    
    case 'CONNECT': {
      if (!change.sourceNodeId || !change.targetNodeId || !change.edgeType) {
        throw new Error('CONNECT change missing required fields');
      }
      
      graphStore.addEdge({
        id: uuid(),
        type: change.edgeType,
        from: change.sourceNodeId,
        to: change.targetNodeId,
      });
      break;
    }
    
    case 'STRENGTHEN':
    case 'WEAKEN': {
      if (!change.nodeId || change.confidenceDelta === undefined) {
        throw new Error(`${change.type} change missing nodeId or confidenceDelta`);
      }
      
      const node = graphStore.getNode(change.nodeId);
      if (!node) {
        throw new Error(`Node ${change.nodeId} not found`);
      }
      
      const newConfidence = Math.max(0, Math.min(100, node.confidence + change.confidenceDelta));
      graphStore.updateNode(change.nodeId, { confidence: newConfidence });
      break;
    }
    
    case 'CONTRADICT': {
      // For contradict, we add an edge marking the conflict
      if (!change.nodeAId || !change.nodeBId) {
        throw new Error('CONTRADICT change missing nodeAId or nodeBId');
      }
      
      graphStore.addEdge({
        id: uuid(),
        type: 'contradicts',
        from: change.nodeAId,
        to: change.nodeBId,
      });
      break;
    }
    
    case 'MERGE': {
      if (!change.nodeIds || change.nodeIds.length < 2) {
        throw new Error('MERGE change requires at least 2 nodeIds');
      }
      
      // Create merged node
      const mergedId = uuid();
      const now = new Date();
      
      const mergedNode: ClaimNode = {
        id: mergedId,
        type: 'claim',
        title: change.mergedTitle || 'Merged Node',
        content: change.mergedContent || '',
        confidence: 70,
        createdAt: now,
        updatedAt: now,
        versions: [],
        tested: false,
      };
      
      graphStore.addNode(mergedNode);
      
      // Transfer edges from old nodes to merged node
      for (const oldId of change.nodeIds) {
        const children = graphStore.getChildren(oldId);
        const parents = graphStore.getParents(oldId);
        
        // Connect merged node to children
        children.forEach(child => {
          graphStore.addEdge({
            id: uuid(),
            type: 'supports',
            from: mergedId,
            to: child.node.id,
          });
        });
        
        // Connect parents to merged node
        parents.forEach(parent => {
          graphStore.addEdge({
            id: uuid(),
            type: 'supports',
            from: parent.node.id,
            to: mergedId,
          });
        });
        
        // Remove old node
        graphStore.removeNode(oldId);
      }
      break;
    }
    
    case 'SPLIT': {
      if (!change.originalNodeId || !change.splitInto || change.splitInto.length < 2) {
        throw new Error('SPLIT change requires originalNodeId and at least 2 splitInto specs');
      }
      
      const now = new Date();
      const newNodeIds: string[] = [];
      
      // Create new nodes
      for (const spec of change.splitInto) {
        const newId = uuid();
        newNodeIds.push(newId);
        
        const newNode: ClaimNode = {
          id: newId,
          type: 'claim',
          title: spec.title,
          content: spec.content,
          confidence: 70,
          createdAt: now,
          updatedAt: now,
          versions: [],
          tested: false,
        };
        
        graphStore.addNode(newNode);
      }
      
      // Transfer edges from original to new nodes
      const children = graphStore.getChildren(change.originalNodeId);
      const parents = graphStore.getParents(change.originalNodeId);
      
      // Connect all new nodes to children
      children.forEach(child => {
        newNodeIds.forEach(newId => {
          graphStore.addEdge({
            id: uuid(),
            type: 'supports',
            from: newId,
            to: child.node.id,
          });
        });
      });
      
      // Connect parents to all new nodes
      parents.forEach(parent => {
        newNodeIds.forEach(newId => {
          graphStore.addEdge({
            id: uuid(),
            type: 'supports',
            from: parent.node.id,
            to: newId,
          });
        });
      });
      
      // Remove original node
      graphStore.removeNode(change.originalNodeId);
      break;
    }
    
    case 'SUGGEST':
      // Suggestions don't directly modify the graph
      // They're informational and can be dismissed
      break;
      
    default:
      throw new Error(`Unknown change type: ${change.type}`);
  }
}

// =============================================================================
// HOOKS
// =============================================================================

export function useDiffPanelOpen() {
  return useDiffStore(state => state.isOpen);
}

export function useDiffChanges() {
  const changes = useDiffStore(state => state.proposedChanges);
  const statuses = useDiffStore(state => state.changeStatuses);
  const edited = useDiffStore(state => state.editedChanges);
  return { changes, statuses, edited };
}

export function useDiffCounts() {
  const pending = useDiffStore(state => state.pendingCount);
  const accepted = useDiffStore(state => state.acceptedCount);
  const rejected = useDiffStore(state => state.rejectedCount);
  const total = useDiffStore(state => state.proposedChanges.length);
  return { pending, accepted, rejected, total };
}

// Stable empty object to avoid re-renders
const EMPTY_HIGHLIGHTS: Record<string, HighlightType> = {};

export function useHighlightedNodes(): Record<string, HighlightType> {
  const isOpen = useDiffStore(state => state.isOpen);
  const proposedChanges = useDiffStore(state => state.proposedChanges);
  const changeStatuses = useDiffStore(state => state.changeStatuses);
  
  // Return empty object if diff panel is closed
  if (!isOpen || proposedChanges.length === 0) {
    return EMPTY_HIGHLIGHTS;
  }
  
  // Compute highlights from the raw data
  const highlights: Record<string, HighlightType> = {};
  
  for (const change of proposedChanges) {
    const status = changeStatuses[change.id];
    if (status === 'rejected') continue;
    
    switch (change.type) {
      case 'UPDATE':
        if (change.targetNodeId) {
          highlights[change.targetNodeId] = 'update';
        }
        break;
        
      case 'ADD':
        change.connectTo?.forEach(conn => {
          if (!highlights[conn.nodeId]) {
            highlights[conn.nodeId] = 'add';
          }
        });
        break;
        
      case 'CONNECT':
        if (change.sourceNodeId) highlights[change.sourceNodeId] = 'connect';
        if (change.targetNodeId) highlights[change.targetNodeId] = 'connect';
        break;
        
      case 'STRENGTHEN':
        if (change.nodeId) highlights[change.nodeId] = 'strengthen';
        break;
        
      case 'WEAKEN':
        if (change.nodeId) highlights[change.nodeId] = 'weaken';
        break;
        
      case 'CONTRADICT':
        if (change.nodeAId) highlights[change.nodeAId] = 'contradict';
        if (change.nodeBId) highlights[change.nodeBId] = 'contradict';
        break;
    }
  }
  
  return highlights;
}
