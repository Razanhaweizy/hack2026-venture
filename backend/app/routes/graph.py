"""
Graph API Routes
REST API endpoints for graph operations
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import PlainTextResponse
from typing import List, Dict, Any

from ..models.graph import (
    CreateNodeInput, CreateEdgeInput, UpdateNodeInput,
    GraphState, NodeResponse, EdgeResponse, ProgressResponse
)
from ..services.graph_service import GraphService

router = APIRouter(prefix="/api/graph", tags=["graph"])

# Global graph service instance
_graph_service: GraphService = None


def get_graph_service() -> GraphService:
    """Get or create the graph service singleton"""
    global _graph_service
    if _graph_service is None:
        _graph_service = GraphService()
    return _graph_service


# =============================================================================
# GRAPH STATE
# =============================================================================

@router.get("/state", response_model=GraphState)
async def get_graph_state():
    """Get the complete graph state (all nodes and edges)"""
    service = get_graph_service()
    return service.get_graph_state()


@router.get("/progress", response_model=ProgressResponse)
async def get_progress():
    """Get skeleton completion progress"""
    service = get_graph_service()
    return service.get_progress()


# =============================================================================
# NODE OPERATIONS
# =============================================================================

@router.get("/nodes")
async def get_all_nodes() -> List[Dict[str, Any]]:
    """Get all nodes"""
    service = get_graph_service()
    return service.get_all_nodes()


@router.get("/nodes/{node_id}")
async def get_node(node_id: str) -> Dict[str, Any]:
    """Get a single node by ID"""
    service = get_graph_service()
    node = service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.get("/nodes/type/{node_type}")
async def get_nodes_by_type(node_type: str) -> List[Dict[str, Any]]:
    """Get all nodes of a specific type"""
    service = get_graph_service()
    return service.get_nodes_by_type(node_type)


@router.get("/framework-nodes")
async def get_framework_nodes() -> List[Dict[str, Any]]:
    """Get all framework nodes"""
    service = get_graph_service()
    return service.get_framework_nodes()


@router.post("/nodes", response_model=NodeResponse)
async def create_node(input_data: CreateNodeInput):
    """Create a new node"""
    service = get_graph_service()
    try:
        node = service.add_node(input_data)
        return NodeResponse(success=True, node=node)
    except Exception as e:
        return NodeResponse(success=False, message=str(e))


@router.put("/nodes/{node_id}", response_model=NodeResponse)
async def update_node(node_id: str, updates: UpdateNodeInput):
    """Update an existing node"""
    service = get_graph_service()
    node = service.update_node(node_id, updates)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return NodeResponse(success=True, node=node)


@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    """Delete a node"""
    service = get_graph_service()
    success = service.remove_node(node_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete node (may be a skeleton node)")
    return {"success": True}


# =============================================================================
# EDGE OPERATIONS
# =============================================================================

@router.get("/edges")
async def get_all_edges() -> List[Dict[str, Any]]:
    """Get all edges"""
    service = get_graph_service()
    return service.get_all_edges()


@router.get("/edges/{edge_id}")
async def get_edge(edge_id: str) -> Dict[str, Any]:
    """Get a single edge by ID"""
    service = get_graph_service()
    edge = service.get_edge(edge_id)
    if not edge:
        raise HTTPException(status_code=404, detail="Edge not found")
    return edge


@router.post("/edges", response_model=EdgeResponse)
async def create_edge(input_data: CreateEdgeInput):
    """Create a new edge"""
    service = get_graph_service()
    try:
        edge = service.add_edge(input_data)
        return EdgeResponse(success=True, edge=edge)
    except Exception as e:
        return EdgeResponse(success=False, message=str(e))


@router.delete("/edges/{edge_id}")
async def delete_edge(edge_id: str):
    """Delete an edge"""
    service = get_graph_service()
    success = service.remove_edge(edge_id)
    if not success:
        raise HTTPException(status_code=404, detail="Edge not found")
    return {"success": True}


# =============================================================================
# GRAPH TRAVERSAL
# =============================================================================

@router.get("/nodes/{node_id}/connected")
async def get_connected_nodes(node_id: str) -> List[Dict[str, Any]]:
    """Get all nodes connected to a given node"""
    service = get_graph_service()
    if not service.get_node(node_id):
        raise HTTPException(status_code=404, detail="Node not found")
    return service.get_connected_nodes(node_id)


# =============================================================================
# EXPORT
# =============================================================================

@router.get("/export/nodes.csv")
async def export_nodes_csv():
    """Export nodes as CSV file"""
    service = get_graph_service()
    csv_content = service.export_nodes_csv()
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nodes.csv"}
    )


@router.get("/export/edges.csv")
async def export_edges_csv():
    """Export edges as CSV file"""
    service = get_graph_service()
    csv_content = service.export_edges_csv()
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=edges.csv"}
    )
