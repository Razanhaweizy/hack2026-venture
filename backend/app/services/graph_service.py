"""
Graph Service
Manages the in-memory graph state and operations
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Set
import uuid

from ..models.graph import (
    NodeType, EdgeType, FrameworkCategory,
    CreateNodeInput, CreateEdgeInput, UpdateNodeInput
)
from .csv_service import CSVService


class GraphService:
    """Service for managing graph data in memory with CSV persistence"""
    
    def __init__(self, csv_service: CSVService = None):
        self.csv_service = csv_service or CSVService()
        
        # In-memory storage
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: Dict[str, Dict[str, Any]] = {}
        
        # Edge indices for fast lookups
        self.outgoing_edges: Dict[str, Set[str]] = {}  # node_id -> set of edge_ids
        self.incoming_edges: Dict[str, Set[str]] = {}  # node_id -> set of edge_ids
        
        # Load initial data
        self._load_from_csv()
    
    # =========================================================================
    # INITIALIZATION
    # =========================================================================
    
    def _load_from_csv(self) -> None:
        """Load graph data from CSV files"""
        # Load nodes
        nodes_data = self.csv_service.load_nodes()
        for node in nodes_data:
            self.nodes[node['id']] = node
        
        # Load edges
        edges_data = self.csv_service.load_edges()
        for edge in edges_data:
            self.edges[edge['id']] = edge
            self._index_edge(edge)
        
        print(f"Loaded {len(self.nodes)} nodes and {len(self.edges)} edges from CSV")
    
    def _save_to_csv(self) -> None:
        """Save current graph state to CSV files"""
        self.csv_service.save_nodes(list(self.nodes.values()))
        self.csv_service.save_edges(list(self.edges.values()))
    
    def _index_edge(self, edge: Dict[str, Any]) -> None:
        """Add edge to indices"""
        from_id = edge.get('from', '')
        to_id = edge.get('to', '')
        edge_id = edge['id']
        
        if from_id not in self.outgoing_edges:
            self.outgoing_edges[from_id] = set()
        self.outgoing_edges[from_id].add(edge_id)
        
        if to_id not in self.incoming_edges:
            self.incoming_edges[to_id] = set()
        self.incoming_edges[to_id].add(edge_id)
    
    def _unindex_edge(self, edge: Dict[str, Any]) -> None:
        """Remove edge from indices"""
        from_id = edge.get('from', '')
        to_id = edge.get('to', '')
        edge_id = edge['id']
        
        if from_id in self.outgoing_edges:
            self.outgoing_edges[from_id].discard(edge_id)
        if to_id in self.incoming_edges:
            self.incoming_edges[to_id].discard(edge_id)
    
    # =========================================================================
    # NODE OPERATIONS
    # =========================================================================
    
    def get_all_nodes(self) -> List[Dict[str, Any]]:
        """Get all nodes"""
        return list(self.nodes.values())
    
    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get a single node by ID"""
        return self.nodes.get(node_id)
    
    def get_nodes_by_type(self, node_type: str) -> List[Dict[str, Any]]:
        """Get all nodes of a specific type"""
        return [n for n in self.nodes.values() if n.get('type') == node_type]
    
    def get_framework_nodes(self) -> List[Dict[str, Any]]:
        """Get all framework nodes"""
        return self.get_nodes_by_type('framework')
    
    def add_node(self, input_data: CreateNodeInput) -> Dict[str, Any]:
        """Add a new node"""
        now = datetime.now()
        
        node = {
            'id': input_data.id or str(uuid.uuid4()),
            'type': input_data.type,
            'title': input_data.title,
            'content': input_data.content,
            'confidence': input_data.confidence,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        }
        
        # Add type-specific fields
        if input_data.type == NodeType.FRAMEWORK:
            node['framework_category'] = input_data.framework_category
            node['description'] = input_data.description or ''
            node['is_skeleton'] = input_data.is_skeleton or False
            node['parent_id'] = input_data.parent_id
            if input_data.position:
                node['position'] = input_data.position.model_dump()
        
        elif input_data.type == NodeType.CLAIM:
            node['source'] = input_data.source
            node['tested'] = input_data.tested or False
        
        elif input_data.type == NodeType.FACT:
            node['source'] = input_data.source
        
        elif input_data.type == NodeType.EVIDENCE:
            node['valence'] = input_data.valence or 'supporting'
            node['source'] = input_data.source or ''
        
        self.nodes[node['id']] = node
        self._save_to_csv()
        
        return node
    
    def update_node(self, node_id: str, updates: UpdateNodeInput) -> Optional[Dict[str, Any]]:
        """Update an existing node"""
        if node_id not in self.nodes:
            return None
        
        node = self.nodes[node_id]
        
        if updates.title is not None:
            node['title'] = updates.title
        if updates.content is not None:
            node['content'] = updates.content
        if updates.confidence is not None:
            node['confidence'] = updates.confidence
        
        node['updated_at'] = datetime.now().isoformat()
        
        self._save_to_csv()
        
        return node
    
    def remove_node(self, node_id: str) -> bool:
        """Remove a node and its connected edges"""
        if node_id not in self.nodes:
            return False
        
        node = self.nodes[node_id]
        
        # Don't allow removing skeleton framework nodes
        if node.get('type') == 'framework' and node.get('is_skeleton'):
            return False
        
        # Remove connected edges
        edges_to_remove = set()
        edges_to_remove.update(self.outgoing_edges.get(node_id, set()))
        edges_to_remove.update(self.incoming_edges.get(node_id, set()))
        
        for edge_id in edges_to_remove:
            self.remove_edge(edge_id)
        
        # Remove node
        del self.nodes[node_id]
        
        self._save_to_csv()
        
        return True
    
    # =========================================================================
    # EDGE OPERATIONS
    # =========================================================================
    
    def get_all_edges(self) -> List[Dict[str, Any]]:
        """Get all edges"""
        return list(self.edges.values())
    
    def get_edge(self, edge_id: str) -> Optional[Dict[str, Any]]:
        """Get a single edge by ID"""
        return self.edges.get(edge_id)
    
    def add_edge(self, input_data: CreateEdgeInput) -> Dict[str, Any]:
        """Add a new edge"""
        edge = {
            'id': input_data.id or str(uuid.uuid4()),
            'type': input_data.type,
            'from': input_data.from_node,
            'to': input_data.to_node,
            'note': input_data.note,
            'created_at': datetime.now().isoformat(),
        }
        
        self.edges[edge['id']] = edge
        self._index_edge(edge)
        self._save_to_csv()
        
        return edge
    
    def remove_edge(self, edge_id: str) -> bool:
        """Remove an edge"""
        if edge_id not in self.edges:
            return False
        
        edge = self.edges[edge_id]
        self._unindex_edge(edge)
        del self.edges[edge_id]
        
        self._save_to_csv()
        
        return True
    
    # =========================================================================
    # GRAPH TRAVERSAL
    # =========================================================================
    
    def get_connected_nodes(self, node_id: str) -> List[Dict[str, Any]]:
        """Get all nodes connected to a given node"""
        connected = []
        
        # Outgoing edges
        for edge_id in self.outgoing_edges.get(node_id, set()):
            edge = self.edges.get(edge_id)
            if edge:
                target_node = self.nodes.get(edge['to'])
                if target_node:
                    connected.append({
                        'node': target_node,
                        'edge': edge,
                        'direction': 'child'
                    })
        
        # Incoming edges
        for edge_id in self.incoming_edges.get(node_id, set()):
            edge = self.edges.get(edge_id)
            if edge:
                source_node = self.nodes.get(edge['from'])
                if source_node:
                    connected.append({
                        'node': source_node,
                        'edge': edge,
                        'direction': 'parent'
                    })
        
        return connected
    
    def get_progress(self) -> Dict[str, int]:
        """Calculate skeleton completion progress"""
        framework_nodes = self.get_framework_nodes()
        leaf_nodes = [n for n in framework_nodes if n.get('position', {}).get('level') == 2]
        
        answered = 0
        for node in leaf_nodes:
            connected = self.get_connected_nodes(node['id'])
            has_user_content = any(
                c['node'].get('type') != 'framework'
                for c in connected
            )
            if has_user_content:
                answered += 1
        
        total = len(leaf_nodes)
        percentage = round((answered / total) * 100) if total > 0 else 0
        
        return {
            'answered': answered,
            'total': total,
            'percentage': percentage
        }
    
    # =========================================================================
    # EXPORT
    # =========================================================================
    
    def get_graph_state(self) -> Dict[str, Any]:
        """Get complete graph state"""
        return {
            'nodes': list(self.nodes.values()),
            'edges': list(self.edges.values()),
        }
    
    def export_nodes_csv(self) -> str:
        """Export nodes as CSV string"""
        return self.csv_service.export_to_string(list(self.nodes.values()), is_nodes=True)
    
    def export_edges_csv(self) -> str:
        """Export edges as CSV string"""
        return self.csv_service.export_to_string(list(self.edges.values()), is_nodes=False)
