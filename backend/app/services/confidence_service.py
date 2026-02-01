"""
Confidence Service
Calculates honest confidence scores based on evidence quality, not false precision.

Key principles:
- Never claim certainty (cap at 85%)
- Show bands, not precise numbers
- Weight by importance with diminishing returns
- Make it actionable (show how to improve)
"""

import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


# =============================================================================
# CONFIDENCE BANDS
# =============================================================================

CONFIDENCE_BANDS = {
    "high": {
        "level": "high",
        "label": "Strong evidence",
        "description": "Multiple credible sources agree. Still could be wrong.",
        "color": "#007354",  # Sequoia green
    },
    "medium": {
        "level": "medium",
        "label": "Some evidence",
        "description": "Reasonable basis but needs more validation.",
        "color": "#E5A826",  # Warning yellow
    },
    "low": {
        "level": "low",
        "label": "Weak evidence",
        "description": "Limited data. Treat as hypothesis to test.",
        "color": "#FB923C",  # Orange
    },
    "assumption": {
        "level": "assumption",
        "label": "Assumption",
        "description": "No real evidence. Needs validation before building on it.",
        "color": "#D4442E",  # Red
    },
}


# =============================================================================
# WEIGHT CONFIGURATION
# =============================================================================

FACTOR_WEIGHTS = {
    "evidence_strength": 0.25,
    "evidence_quantity": 0.25,
    "source_quality": 0.15,
    "consistency": 0.15,
    "recency": 0.10,
    "specificity": 0.10,
}

# Confidence bounds
MAX_CONFIDENCE = 0.85  # Can never be truly certain
MIN_CONFIDENCE = 0.10  # Even pure assumption has some value


# =============================================================================
# CORE CALCULATION
# =============================================================================

def calculate_confidence(
    evidence_strength: float,
    evidence_quantity: float,
    source_quality: float,
    consistency: float,
    recency: float,
    specificity: float
) -> Dict[str, Any]:
    """
    Calculate confidence using weighted factors.
    
    Returns dict with:
    - band: confidence band info (level, label, description, color)
    - factors: individual factor assessments (not scores, but labels)
    - limiting_factor: weakest factor (what needs improvement)
    - strongest_factor: strongest factor
    
    NOTE: No numeric scores are returned - only honest band labels.
    """
    
    factors = {
        "evidence_strength": max(0.0, min(1.0, evidence_strength)),
        "evidence_quantity": max(0.0, min(1.0, evidence_quantity)),
        "source_quality": max(0.0, min(1.0, source_quality)),
        "consistency": max(0.0, min(1.0, consistency)),
        "recency": max(0.0, min(1.0, recency)),
        "specificity": max(0.0, min(1.0, specificity)),
    }
    
    # Weighted combination (internal only)
    raw_score = sum(
        factors[k] * FACTOR_WEIGHTS[k]
        for k in factors
    )
    
    # Scale to range with floor and ceiling (internal only)
    scaled = MIN_CONFIDENCE + (raw_score * (MAX_CONFIDENCE - MIN_CONFIDENCE))
    
    # Get confidence band
    band = get_confidence_band(scaled)
    
    # Find limiting and strongest factors
    limiting_factor = min(factors, key=factors.get)
    strongest_factor = max(factors, key=factors.get)
    
    # Convert factors to labels (not numeric scores)
    factor_labels = {
        k: _factor_value_to_label(v) for k, v in factors.items()
    }
    
    return {
        "band": band,
        "factors": factor_labels,
        "limiting_factor": limiting_factor,
        "strongest_factor": strongest_factor,
        # Internal score kept for edge coloring only (not shown to users)
        "_internal_score": round(scaled * 100),
    }


def _factor_value_to_label(value: float) -> str:
    """Convert internal factor value to human-readable label"""
    if value >= 0.8:
        return "Strong"
    elif value >= 0.6:
        return "Good"
    elif value >= 0.4:
        return "Moderate"
    elif value >= 0.2:
        return "Weak"
    else:
        return "Missing"


def get_confidence_band(score: float) -> Dict[str, Any]:
    """Convert score to honest band with description"""
    
    if score >= 0.75:
        return dict(CONFIDENCE_BANDS["high"])
    elif score >= 0.55:
        return dict(CONFIDENCE_BANDS["medium"])
    elif score >= 0.35:
        return dict(CONFIDENCE_BANDS["low"])
    else:
        return dict(CONFIDENCE_BANDS["assumption"])


def get_band_from_score(score: int) -> Dict[str, Any]:
    """Get band from integer score (0-100)"""
    return get_confidence_band(score / 100.0)


# =============================================================================
# EVIDENCE ASSESSMENT
# =============================================================================

def assess_evidence_strength(evidence: Dict[str, Any]) -> float:
    """Assess how strong a piece of evidence is"""
    
    content = (evidence.get("content", "") or "").lower()
    
    # Direct action/commitment signals (strongest)
    commitment_phrases = ["paid", "signed", "bought", "purchased", "deposited", "subscribed", "converted"]
    if any(phrase in content for phrase in commitment_phrases):
        return 1.0
    
    # Explicit statement signals
    explicit_phrases = ["said", "told me", "mentioned", "stated", "confirmed", "agreed", "committed"]
    if any(phrase in content for phrase in explicit_phrases):
        return 0.7
    
    # Behavioral signals
    behavior_phrases = ["spent", "used", "tried", "demoed", "tested", "visited", "clicked", "engaged"]
    if any(phrase in content for phrase in behavior_phrases):
        return 0.5
    
    # Second-hand signals (weakest)
    secondhand_phrases = ["heard", "apparently", "supposedly", "someone said", "rumor", "might"]
    if any(phrase in content for phrase in secondhand_phrases):
        return 0.3
    
    return 0.4  # Default for unclear


def assess_source_quality(evidence: Dict[str, Any]) -> float:
    """Assess quality of the source"""
    
    source = (evidence.get("source", "") or "").lower()
    content = (evidence.get("content", "") or "").lower()
    combined = source + " " + content
    
    # Perfect ICP signals (target customer)
    icp_signals = ["customer", "user", "buyer", "client", "prospect", "paying", "subscriber"]
    if any(signal in combined for signal in icp_signals):
        return 0.9
    
    # Expert signals
    expert_signals = ["expert", "analyst", "researcher", "founder of", "ceo", "vp", "director", "industry"]
    if any(signal in combined for signal in expert_signals):
        return 0.6
    
    # Data/research signals
    data_signals = ["study", "research", "survey", "data", "report", "analysis"]
    if any(signal in combined for signal in data_signals):
        return 0.5
    
    # Weak source signals
    weak_signals = ["friend", "family", "colleague", "someone", "person", "guy"]
    if any(signal in combined for signal in weak_signals):
        return 0.3
    
    return 0.5  # Default


def assess_specificity(content: str) -> float:
    """Assess how specific/quantified the content is"""
    
    if not content:
        return 0.3
    
    content_lower = content.lower()
    
    # Has specific numbers (strongest)
    has_numbers = bool(re.search(r'\$[\d,]+|\d+%|\d+\s*(users|customers|people|companies|clients)', content_lower))
    if has_numbers:
        return 0.9
    
    # Has dollar amounts or metrics
    has_metrics = bool(re.search(r'\$\d|ARR|MRR|revenue|conversion|churn|\d+x', content_lower))
    if has_metrics:
        return 0.8
    
    # Has ranges
    has_ranges = bool(re.search(r'\d+\s*-\s*\d+|between|from .* to', content_lower))
    if has_ranges:
        return 0.7
    
    # Has time specifics
    has_time = bool(re.search(r'(january|february|march|april|may|june|july|august|september|october|november|december|q[1-4]|20\d\d)', content_lower))
    if has_time:
        return 0.6
    
    # Vague quantifiers (weakest)
    vague_words = ["some", "many", "few", "a lot", "significant", "considerable", "several", "most", "often"]
    if any(word in content_lower for word in vague_words):
        return 0.3
    
    return 0.5  # Default


def calculate_recency_score(evidence_list: List[Dict[str, Any]]) -> float:
    """Calculate recency score based on evidence dates"""
    
    if not evidence_list:
        return 0.5  # Unknown
    
    # Find most recent evidence
    dates = []
    for e in evidence_list:
        created = e.get("created_at")
        if created:
            if isinstance(created, str):
                try:
                    dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                    dates.append(dt)
                except:
                    pass
            elif isinstance(created, datetime):
                dates.append(created)
    
    if not dates:
        return 0.5  # Unknown
    
    most_recent = max(dates)
    now = datetime.now(most_recent.tzinfo) if most_recent.tzinfo else datetime.now()
    days_old = (now - most_recent).days
    
    if days_old <= 30:
        return 1.0
    elif days_old <= 90:
        return 0.8
    elif days_old <= 180:
        return 0.6
    elif days_old <= 365:
        return 0.4
    else:
        return 0.2


# =============================================================================
# NODE CONFIDENCE ASSESSMENT
# =============================================================================

def assess_node_confidence(
    node: Dict[str, Any],
    graph_state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Automatically assess confidence factors for a node
    based on connected evidence.
    """
    
    node_id = node.get("id", "")
    nodes = graph_state.get("nodes", [])
    edges = graph_state.get("edges", [])
    
    # Build lookup maps
    node_map = {n["id"]: n for n in nodes}
    
    # Get connected evidence
    supporting_evidence = []
    contradicting_evidence = []
    
    for edge in edges:
        source_id = edge.get("from") or edge.get("source_id", "")
        target_id = edge.get("to") or edge.get("target_id", "")
        edge_type = edge.get("type", "supports")
        
        # Evidence pointing TO this node
        if target_id == node_id:
            source_node = node_map.get(source_id, {})
            if source_node.get("type") == "evidence":
                if edge_type == "contradicts":
                    contradicting_evidence.append(source_node)
                else:
                    supporting_evidence.append(source_node)
        
        # Evidence pointing FROM this node (inverse relationship)
        if source_id == node_id:
            target_node = node_map.get(target_id, {})
            if target_node.get("type") == "evidence":
                if edge_type == "contradicts":
                    contradicting_evidence.append(target_node)
                else:
                    supporting_evidence.append(target_node)
    
    # Also include claims as weak evidence
    for edge in edges:
        source_id = edge.get("from") or edge.get("source_id", "")
        target_id = edge.get("to") or edge.get("target_id", "")
        
        if target_id == node_id:
            source_node = node_map.get(source_id, {})
            if source_node.get("type") == "claim":
                supporting_evidence.append(source_node)
    
    # 1. Evidence Strength
    if not supporting_evidence:
        evidence_strength = 0.1  # Pure assumption
    else:
        strength_scores = [assess_evidence_strength(e) for e in supporting_evidence]
        evidence_strength = max(strength_scores)  # Best evidence counts
    
    # 2. Evidence Quantity (diminishing returns)
    count = len(supporting_evidence)
    if count >= 10:
        evidence_quantity = 1.0
    elif count >= 5:
        evidence_quantity = 0.7
    elif count >= 2:
        evidence_quantity = 0.5
    elif count == 1:
        evidence_quantity = 0.3
    else:
        evidence_quantity = 0.1
    
    # 3. Source Quality
    if not supporting_evidence:
        source_quality = 0.1
    else:
        quality_scores = [assess_source_quality(e) for e in supporting_evidence]
        source_quality = sum(quality_scores) / len(quality_scores)
    
    # 4. Consistency (contradictions hurt more than support helps)
    total = len(supporting_evidence) + len(contradicting_evidence)
    if total == 0:
        consistency = 0.5  # Unknown
    else:
        agreement_ratio = len(supporting_evidence) / total
        if len(contradicting_evidence) > 0:
            # Contradictions hurt more
            consistency = agreement_ratio * 0.7
        else:
            consistency = agreement_ratio
    
    # 5. Recency
    recency = calculate_recency_score(supporting_evidence)
    
    # 6. Specificity (of the node itself)
    specificity = assess_specificity(node.get("content", ""))
    
    # Calculate final confidence
    result = calculate_confidence(
        evidence_strength=evidence_strength,
        evidence_quantity=evidence_quantity,
        source_quality=source_quality,
        consistency=consistency,
        recency=recency,
        specificity=specificity
    )
    
    # Add actionable suggestions
    result["to_increase"] = generate_improvement_suggestion(result)
    result["evidence_count"] = {
        "supporting": len(supporting_evidence),
        "contradicting": len(contradicting_evidence),
    }
    
    return result


def generate_improvement_suggestion(confidence_result: Dict[str, Any]) -> str:
    """Generate actionable suggestion to increase confidence"""
    
    limiting = confidence_result.get("limiting_factor", "")
    factors = confidence_result.get("factors", {})
    
    suggestions = {
        "evidence_strength": "Get direct customer commitments (payments, sign-ups)",
        "evidence_quantity": "Gather more independent data points",
        "source_quality": "Talk to actual target customers, not proxies",
        "consistency": "Investigate and resolve contradicting evidence",
        "recency": "Gather fresh data - markets change fast",
        "specificity": "Add specific numbers and metrics",
    }
    
    return suggestions.get(limiting, "Add more evidence to support this claim")


# =============================================================================
# BULK OPERATIONS
# =============================================================================

def assess_all_nodes_confidence(graph_state: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Assess confidence for all non-framework nodes in the graph.
    Returns dict mapping node_id -> confidence_result
    """
    
    results = {}
    nodes = graph_state.get("nodes", [])
    
    for node in nodes:
        # Skip framework nodes (they don't need confidence)
        if node.get("type") == "framework":
            continue
        # Skip startup_meta nodes
        if node.get("type") == "startup_meta":
            continue
            
        node_id = node.get("id", "")
        results[node_id] = assess_node_confidence(node, graph_state)
    
    return results


def get_confidence_summary(graph_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get summary of confidence across the graph.
    """
    
    assessments = assess_all_nodes_confidence(graph_state)
    
    band_counts = {
        "high": 0,
        "medium": 0,
        "low": 0,
        "assumption": 0,
    }
    
    limiting_factors = {}
    
    for node_id, assessment in assessments.items():
        band_level = assessment.get("band", {}).get("level", "assumption")
        band_counts[band_level] = band_counts.get(band_level, 0) + 1
        
        limiting = assessment.get("limiting_factor", "unknown")
        limiting_factors[limiting] = limiting_factors.get(limiting, 0) + 1
    
    total = sum(band_counts.values())
    
    return {
        "total_assessed": total,
        "band_distribution": band_counts,
        "band_percentages": {
            k: round((v / total) * 100) if total > 0 else 0
            for k, v in band_counts.items()
        },
        "top_limiting_factors": sorted(
            limiting_factors.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3],
        "overall_health": _assess_overall_health(band_counts),
    }


def _assess_overall_health(band_counts: Dict[str, int]) -> str:
    """Assess overall graph confidence health"""
    
    total = sum(band_counts.values())
    if total == 0:
        return "empty"
    
    assumption_pct = band_counts.get("assumption", 0) / total
    low_pct = band_counts.get("low", 0) / total
    high_pct = band_counts.get("high", 0) / total
    
    if assumption_pct > 0.5:
        return "mostly_assumptions"
    elif assumption_pct + low_pct > 0.7:
        return "needs_validation"
    elif high_pct > 0.5:
        return "well_evidenced"
    else:
        return "mixed"
