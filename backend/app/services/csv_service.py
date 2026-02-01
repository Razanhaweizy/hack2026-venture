"""
CSV Service
Handles reading and writing graph data to CSV files
"""

import csv
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from ..models.graph import (
    NodeType, EdgeType, FrameworkCategory, EvidenceValence, PmfPath,
    FrameworkNode, ClaimNode, FactNode, EvidenceNode, StartupMetaNode,
    GraphEdge, PositionHint
)


class CSVService:
    """Service for CSV persistence of graph data"""
    
    # CSV column headers
    NODE_HEADERS = [
        'id', 'type', 'title', 'content', 'confidence',
        'created_at', 'updated_at', 'source', 'tested',
        'valence', 'framework_category', 'description', 'is_skeleton',
        'parent_id', 'position_x', 'position_y', 'position_level',
        # StartupMeta specific fields
        'pmf_path', 'pmf_path_confidence', 'pmf_path_detected_at', 'startup_name'
    ]
    
    EDGE_HEADERS = [
        'id', 'type', 'from', 'to', 'note', 'created_at'
    ]
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Default to data directory relative to backend
            self.data_dir = Path(__file__).parent.parent.parent / "data"
        else:
            self.data_dir = Path(data_dir)
        
        # Ensure data directory exists
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.nodes_file = self.data_dir / "nodes.csv"
        self.edges_file = self.data_dir / "edges.csv"
    
    # =========================================================================
    # NODE OPERATIONS
    # =========================================================================
    
    def load_nodes(self) -> List[Dict[str, Any]]:
        """Load all nodes from CSV file"""
        if not self.nodes_file.exists():
            return []
        
        nodes = []
        with open(self.nodes_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                node = self._parse_node_row(row)
                if node:
                    nodes.append(node)
        
        return nodes
    
    def save_nodes(self, nodes: List[Dict[str, Any]]) -> None:
        """Save all nodes to CSV file"""
        with open(self.nodes_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=self.NODE_HEADERS)
            writer.writeheader()
            
            for node in nodes:
                row = self._node_to_row(node)
                writer.writerow(row)
    
    def _parse_node_row(self, row: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Parse a CSV row into a node dictionary"""
        try:
            node_type = row.get('type', '')
            
            base = {
                'id': row['id'],
                'type': node_type,
                'title': row.get('title', ''),
                'content': row.get('content', ''),
                'confidence': int(row.get('confidence', 50)),
                'created_at': row.get('created_at', datetime.now().isoformat()),
                'updated_at': row.get('updated_at', datetime.now().isoformat()),
            }
            
            if node_type == 'framework':
                base['framework_category'] = row.get('framework_category') or None
                base['description'] = row.get('description', '')
                base['is_skeleton'] = row.get('is_skeleton', '').lower() == 'true'
                base['parent_id'] = row.get('parent_id') or None
                
                if row.get('position_x'):
                    base['position'] = {
                        'x': float(row.get('position_x', 0)),
                        'y': float(row.get('position_y', 0)),
                        'level': int(row.get('position_level', 0)),
                    }
            
            elif node_type == 'claim':
                base['source'] = row.get('source') or None
                base['tested'] = row.get('tested', '').lower() == 'true'
            
            elif node_type == 'fact':
                base['source'] = row.get('source') or None
            
            elif node_type == 'evidence':
                base['valence'] = row.get('valence', 'supporting')
                base['source'] = row.get('source', '')
            
            elif node_type == 'startup_meta':
                pmf_path = row.get('pmf_path') or None
                base['pmf_path'] = pmf_path if pmf_path in ['hair_on_fire', 'hard_fact', 'future_vision'] else None
                base['pmf_path_confidence'] = int(row.get('pmf_path_confidence', 100))
                base['pmf_path_detected_at'] = row.get('pmf_path_detected_at') or None
                base['startup_name'] = row.get('startup_name') or None
            
            return base
            
        except Exception as e:
            print(f"Error parsing node row: {e}")
            return None
    
    def _node_to_row(self, node: Dict[str, Any]) -> Dict[str, str]:
        """Convert a node dictionary to a CSV row"""
        created_at = node.get('created_at', '')
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        
        updated_at = node.get('updated_at', '')
        if isinstance(updated_at, datetime):
            updated_at = updated_at.isoformat()
        
        position = node.get('position', {}) or {}
        
        # Handle pmf_path_detected_at datetime
        pmf_detected = node.get('pmf_path_detected_at', '')
        if isinstance(pmf_detected, datetime):
            pmf_detected = pmf_detected.isoformat()
        
        return {
            'id': node.get('id', ''),
            'type': node.get('type', ''),
            'title': node.get('title', ''),
            'content': node.get('content', ''),
            'confidence': str(node.get('confidence', 50)),
            'created_at': created_at,
            'updated_at': updated_at,
            'source': node.get('source', '') or '',
            'tested': str(node.get('tested', '')).lower() if node.get('tested') is not None else '',
            'valence': node.get('valence', '') or '',
            'framework_category': node.get('framework_category', '') or '',
            'description': node.get('description', '') or '',
            'is_skeleton': str(node.get('is_skeleton', '')).lower() if node.get('is_skeleton') is not None else '',
            'parent_id': node.get('parent_id', '') or '',
            'position_x': str(position.get('x', '')) if position else '',
            'position_y': str(position.get('y', '')) if position else '',
            'position_level': str(position.get('level', '')) if position else '',
            # StartupMeta fields
            'pmf_path': node.get('pmf_path', '') or '',
            'pmf_path_confidence': str(node.get('pmf_path_confidence', '')) if node.get('pmf_path_confidence') is not None else '',
            'pmf_path_detected_at': pmf_detected or '',
            'startup_name': node.get('startup_name', '') or '',
        }
    
    # =========================================================================
    # EDGE OPERATIONS
    # =========================================================================
    
    def load_edges(self) -> List[Dict[str, Any]]:
        """Load all edges from CSV file"""
        if not self.edges_file.exists():
            return []
        
        edges = []
        with open(self.edges_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                edge = self._parse_edge_row(row)
                if edge:
                    edges.append(edge)
        
        return edges
    
    def save_edges(self, edges: List[Dict[str, Any]]) -> None:
        """Save all edges to CSV file"""
        with open(self.edges_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=self.EDGE_HEADERS)
            writer.writeheader()
            
            for edge in edges:
                row = self._edge_to_row(edge)
                writer.writerow(row)
    
    def _parse_edge_row(self, row: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Parse a CSV row into an edge dictionary"""
        try:
            return {
                'id': row['id'],
                'type': row.get('type', 'supports'),
                'from': row.get('from', ''),
                'to': row.get('to', ''),
                'note': row.get('note') or None,
                'created_at': row.get('created_at', datetime.now().isoformat()),
            }
        except Exception as e:
            print(f"Error parsing edge row: {e}")
            return None
    
    def _edge_to_row(self, edge: Dict[str, Any]) -> Dict[str, str]:
        """Convert an edge dictionary to a CSV row"""
        created_at = edge.get('created_at', '')
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        
        return {
            'id': edge.get('id', ''),
            'type': edge.get('type', ''),
            'from': edge.get('from', ''),
            'to': edge.get('to', ''),
            'note': edge.get('note', '') or '',
            'created_at': created_at,
        }
    
    # =========================================================================
    # UTILITY
    # =========================================================================
    
    def export_to_string(self, nodes: List[Dict[str, Any]], is_nodes: bool = True) -> str:
        """Export data to CSV string"""
        import io
        
        output = io.StringIO()
        headers = self.NODE_HEADERS if is_nodes else self.EDGE_HEADERS
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for item in nodes:
            if is_nodes:
                row = self._node_to_row(item)
            else:
                row = self._edge_to_row(item)
            writer.writerow(row)
        
        return output.getvalue()
