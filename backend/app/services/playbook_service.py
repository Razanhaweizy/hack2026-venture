"""
Playbook Service
Path-specific playbooks that provide strategic guidance based on PMF path.

Each path (Hair on Fire, Hard Fact, Future Vision) has a completely different
strategic playbook with rules, warnings, metrics, and benchmarks.
"""

from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum


class Severity(str, Enum):
    """How severe is this playbook violation"""
    BLOCKER = "blocker"      # Stop everything and fix this
    WARNING = "warning"      # Important but not blocking
    INFO = "info"            # Good to know


class ActionType(str, Enum):
    """What action should the user take"""
    ADD_NODE = "add_node"           # Add missing information
    ANSWER_QUESTION = "answer_question"  # Answer a specific question
    LINK = "link"                   # Link existing nodes
    REFLECT = "reflect"             # Just think about this


@dataclass
class PlaybookRule:
    """A single rule from the path-specific playbook"""
    id: str
    path: str  # 'hair_on_fire', 'hard_fact', 'future_vision'
    title: str
    message: str
    severity: Severity
    action_label: str
    action_type: ActionType
    condition_description: str  # Human-readable description of when this triggers
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "path": self.path,
            "title": self.title,
            "message": self.message,
            "severity": self.severity.value,
            "action_label": self.action_label,
            "action_type": self.action_type.value,
            "condition_description": self.condition_description,
        }


@dataclass
class PlaybookMetric:
    """A key metric to track for this path"""
    id: str
    name: str
    description: str
    target: str  # What's a good target
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "target": self.target,
        }


@dataclass
class PlaybookWarning:
    """A common mistake to watch out for"""
    id: str
    title: str
    description: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
        }


@dataclass
class Playbook:
    """Complete playbook for a PMF path"""
    path: str
    name: str
    icon: str
    tagline: str
    enemy: str
    job: str
    speed_matters: str
    benchmark_company: str
    benchmark_description: str
    rules: List[PlaybookRule] = field(default_factory=list)
    metrics: List[PlaybookMetric] = field(default_factory=list)
    warnings: List[PlaybookWarning] = field(default_factory=list)
    this_week_actions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "path": self.path,
            "name": self.name,
            "icon": self.icon,
            "tagline": self.tagline,
            "enemy": self.enemy,
            "job": self.job,
            "speed_matters": self.speed_matters,
            "benchmark": {
                "company": self.benchmark_company,
                "description": self.benchmark_description,
            },
            "rules": [r.to_dict() for r in self.rules],
            "metrics": [m.to_dict() for m in self.metrics],
            "warnings": [w.to_dict() for w in self.warnings],
            "this_week_actions": self.this_week_actions,
        }


# =============================================================================
# PLAYBOOK DEFINITIONS
# =============================================================================

PLAYBOOKS: Dict[str, Playbook] = {
    "hair_on_fire": Playbook(
        path="hair_on_fire",
        name="Hair on Fire",
        icon="🔥",
        tagline="Customers are actively searching. You're in a race.",
        enemy="Competitors",
        job="Outexecute",
        speed_matters="Everything",
        benchmark_company="Wiz",
        benchmark_description="$0 to $100M ARR in 18 months",
        rules=[
            PlaybookRule(
                id="hof_no_competitors",
                path="hair_on_fire",
                title="Map your competitors",
                message="You say customers are actively searching, but you haven't mapped competitors. Who are they comparing you to?",
                severity=Severity.BLOCKER,
                action_label="Add competitors",
                action_type=ActionType.ADD_NODE,
                condition_description="No competitor information in the graph",
            ),
            PlaybookRule(
                id="hof_no_differentiation",
                path="hair_on_fire",
                title="Define your differentiation",
                message="'Better' isn't enough in a competitive market. What makes you DIFFERENT, not just better?",
                severity=Severity.BLOCKER,
                action_label="Add differentiation",
                action_type=ActionType.ADD_NODE,
                condition_description="No clear differentiation defined",
            ),
            PlaybookRule(
                id="hof_no_win_rate",
                path="hair_on_fire",
                title="Track win/loss",
                message="You need to know your win rate against specific competitors. Are you winning or losing deals?",
                severity=Severity.WARNING,
                action_label="Add win/loss data",
                action_type=ActionType.ADD_NODE,
                condition_description="No win/loss data tracked",
            ),
            PlaybookRule(
                id="hof_slow_iteration",
                path="hair_on_fire",
                title="Ship faster",
                message="In a Hair on Fire market, speed wins. Your competitor shipped while you planned.",
                severity=Severity.WARNING,
                action_label="Reduce iteration cycle",
                action_type=ActionType.REFLECT,
                condition_description="Slow shipping velocity",
            ),
        ],
        metrics=[
            PlaybookMetric(
                id="time_to_first_customer",
                name="Time to first customer",
                description="How quickly can you get paying customers?",
                target="< 30 days",
            ),
            PlaybookMetric(
                id="win_rate",
                name="Win rate vs competitors",
                description="Percentage of competitive deals you win",
                target="> 40%",
            ),
            PlaybookMetric(
                id="feature_parity_speed",
                name="Feature parity speed",
                description="How fast can you match competitor features?",
                target="< 2 weeks",
            ),
        ],
        warnings=[
            PlaybookWarning(
                id="hof_warn_educate",
                title="'We need to educate the market'",
                description="No you don't. They're already looking. Stop educating and start selling.",
            ),
            PlaybookWarning(
                id="hof_warn_features",
                title="Building features no one asked for",
                description="Talk to active searchers. Build what they need to switch.",
            ),
            PlaybookWarning(
                id="hof_warn_slow",
                title="Slow iteration cycles",
                description="Your competitor shipped while you planned. Speed wins.",
            ),
        ],
        this_week_actions=[
            "Identify top 3 competitors customers compare you to",
            "Define what makes you DIFFERENT (not just better)",
            "Ship something. Anything. Speed wins.",
        ],
    ),
    
    "hard_fact": Playbook(
        path="hard_fact",
        name="Hard Fact",
        icon="📊",
        tagline="Customers have accepted the status quo. You must educate first.",
        enemy="Inertia",
        job="Educate",
        speed_matters="Less critical",
        benchmark_company="HubSpot",
        benchmark_description="Coined 'inbound marketing' to create the category",
        rules=[
            PlaybookRule(
                id="hf_no_trigger",
                path="hard_fact",
                title="Identify the trigger event",
                message="You're fighting inertia, but haven't identified what triggers people to change. What event makes them reconsider?",
                severity=Severity.BLOCKER,
                action_label="Define trigger event",
                action_type=ActionType.ADD_NODE,
                condition_description="No trigger event identified",
            ),
            PlaybookRule(
                id="hf_no_workaround",
                path="hard_fact",
                title="Understand the workaround",
                message="What do they do today? You need to understand their current process to show them something better.",
                severity=Severity.BLOCKER,
                action_label="Document workaround",
                action_type=ActionType.ADD_NODE,
                condition_description="No workaround documented",
            ),
            PlaybookRule(
                id="hf_no_education",
                path="hard_fact",
                title="Create education strategy",
                message="They don't know they need you. How will you educate them about the problem?",
                severity=Severity.WARNING,
                action_label="Add education plan",
                action_type=ActionType.ADD_NODE,
                condition_description="No education/content strategy",
            ),
            PlaybookRule(
                id="hf_fast_expectations",
                path="hard_fact",
                title="Adjust timeline expectations",
                message="Behavior change is slow. Are you expecting fast sales cycles? That's not how Hard Fact works.",
                severity=Severity.WARNING,
                action_label="Review timeline",
                action_type=ActionType.REFLECT,
                condition_description="Unrealistic timeline expectations",
            ),
        ],
        metrics=[
            PlaybookMetric(
                id="content_engagement",
                name="Content engagement",
                description="Are they recognizing the problem through your content?",
                target="Growing awareness",
            ),
            PlaybookMetric(
                id="trigger_frequency",
                name="Trigger event frequency",
                description="How often do trigger events happen in your market?",
                target="Identify and track",
            ),
            PlaybookMetric(
                id="trigger_to_purchase",
                name="Time from trigger to purchase",
                description="How long after a trigger event do they buy?",
                target="Know your cycle",
            ),
        ],
        warnings=[
            PlaybookWarning(
                id="hf_warn_fast",
                title="Expecting fast sales",
                description="Behavior change is slow. Plan for longer cycles than you think.",
            ),
            PlaybookWarning(
                id="hf_warn_features",
                title="Competing on features",
                description="They're not comparing options yet. You need to educate first.",
            ),
            PlaybookWarning(
                id="hf_warn_skip_education",
                title="Skipping education",
                description="They don't know they need you yet. Content and education come first.",
            ),
        ],
        this_week_actions=[
            "Identify what event/pain would make them STOP and reconsider",
            "Talk to someone who recently switched from the old way",
            "Create content that names the problem they've normalized",
        ],
    ),
    
    "future_vision": Playbook(
        path="future_vision",
        name="Future Vision",
        icon="🔮",
        tagline="The market doesn't believe yet. Survive until they do.",
        enemy="Disbelief",
        job="Survive",
        speed_matters="Decades",
        benchmark_company="Nvidia",
        benchmark_description="Gaming GPUs for 25 years → AI revolution",
        rules=[
            PlaybookRule(
                id="fv_no_stepping_stone",
                path="future_vision",
                title="Define your stepping stone",
                message="Your vision is years away. What's your 'pit stop' product that generates revenue while you build toward the vision?",
                severity=Severity.BLOCKER,
                action_label="Add stepping stone",
                action_type=ActionType.ADD_NODE,
                condition_description="No stepping stone product defined",
            ),
            PlaybookRule(
                id="fv_no_believers",
                path="future_vision",
                title="Find true believers",
                message="You need the 10 people who see what you see. Who are your early believers, and why do they believe?",
                severity=Severity.BLOCKER,
                action_label="Identify believers",
                action_type=ActionType.ADD_NODE,
                condition_description="No true believers identified",
            ),
            PlaybookRule(
                id="fv_short_runway",
                path="future_vision",
                title="Extend your runway",
                message="Future Vision is a survival game. Do you have enough runway to outlast the market's disbelief?",
                severity=Severity.BLOCKER,
                action_label="Plan runway extension",
                action_type=ActionType.REFLECT,
                condition_description="Runway too short for vision timeline",
            ),
            PlaybookRule(
                id="fv_vision_before_stepping_stone",
                path="future_vision",
                title="Build stepping stone first",
                message="You're building the vision before the stepping stone. Revenue first, then vision.",
                severity=Severity.WARNING,
                action_label="Prioritize stepping stone",
                action_type=ActionType.REFLECT,
                condition_description="Vision work before revenue",
            ),
        ],
        metrics=[
            PlaybookMetric(
                id="runway_months",
                name="Runway (months)",
                description="How many months can you survive?",
                target="> 24 months",
            ),
            PlaybookMetric(
                id="stepping_stone_revenue",
                name="Stepping stone revenue",
                description="Revenue from your 'pit stop' product",
                target="Growing monthly",
            ),
            PlaybookMetric(
                id="true_believer_count",
                name="True believer count",
                description="Number of people who deeply believe in your vision",
                target="10+ strong believers",
            ),
        ],
        warnings=[
            PlaybookWarning(
                id="fv_warn_money",
                title="Running out of money",
                description="Don't run out of money before the market catches up. Revenue now.",
            ),
            PlaybookWarning(
                id="fv_warn_vision_first",
                title="Building vision before stepping stone",
                description="The stepping stone funds the vision. Build it first.",
            ),
            PlaybookWarning(
                id="fv_warn_hiring",
                title="Hiring too fast",
                description="You need believers, not mercenaries. Hire slow.",
            ),
        ],
        this_week_actions=[
            "Define your 'pit stop' — a real product that makes real money NOW",
            "Find the 10 true believers who see what you see",
            "Accept that the vision is 5-10 years out",
        ],
    ),
}


# =============================================================================
# PLAYBOOK SERVICE FUNCTIONS
# =============================================================================

def get_playbook(pmf_path: str) -> Optional[Playbook]:
    """Get the full playbook for a PMF path"""
    return PLAYBOOKS.get(pmf_path)


def get_playbook_summary(pmf_path: str) -> Optional[Dict[str, Any]]:
    """Get a summary of the playbook for a PMF path"""
    playbook = PLAYBOOKS.get(pmf_path)
    if not playbook:
        return None
    
    return {
        "path": playbook.path,
        "name": playbook.name,
        "icon": playbook.icon,
        "tagline": playbook.tagline,
        "enemy": playbook.enemy,
        "job": playbook.job,
        "speed_matters": playbook.speed_matters,
        "benchmark": {
            "company": playbook.benchmark_company,
            "description": playbook.benchmark_description,
        },
        "this_week_actions": playbook.this_week_actions,
        "warning_count": len(playbook.warnings),
        "rule_count": len(playbook.rules),
    }


def evaluate_playbook_rules(
    pmf_path: str,
    graph_state: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Evaluate which playbook rules are triggered for the current graph state.
    
    Returns a list of triggered rules with their details.
    """
    playbook = PLAYBOOKS.get(pmf_path)
    if not playbook:
        return []
    
    triggered_rules = []
    nodes = graph_state.get("nodes", [])
    
    # Build helper data structures
    node_titles_lower = [n.get("title", "").lower() for n in nodes]
    node_contents_lower = [n.get("content", "").lower() for n in nodes]
    all_text = " ".join(node_titles_lower + node_contents_lower)
    
    # Check each rule based on its ID
    for rule in playbook.rules:
        is_triggered = False
        
        if rule.id == "hof_no_competitors":
            # Check if there's competitor information
            competitor_keywords = ["competitor", "competition", "rival", "alternative", "vs", "versus", "compared to"]
            is_triggered = not any(kw in all_text for kw in competitor_keywords)
        
        elif rule.id == "hof_no_differentiation":
            # Check for differentiation info
            diff_keywords = ["different", "unique", "only", "unlike", "10x", "fundamentally", "unfair advantage"]
            is_triggered = not any(kw in all_text for kw in diff_keywords)
        
        elif rule.id == "hof_no_win_rate":
            # Check for win/loss data
            win_keywords = ["win rate", "win/loss", "won deal", "lost deal", "competitive deal"]
            is_triggered = not any(kw in all_text for kw in win_keywords)
        
        elif rule.id == "hf_no_trigger":
            # Check for trigger event
            trigger_keywords = ["trigger", "what makes them", "when do they", "event that", "pain point", "breaking point"]
            is_triggered = not any(kw in all_text for kw in trigger_keywords)
        
        elif rule.id == "hf_no_workaround":
            # Check for workaround documentation
            workaround_keywords = ["workaround", "currently use", "today they", "manual", "spreadsheet", "existing process"]
            is_triggered = not any(kw in all_text for kw in workaround_keywords)
        
        elif rule.id == "hf_no_education":
            # Check for education strategy
            edu_keywords = ["educate", "content", "blog", "webinar", "thought leadership", "awareness"]
            is_triggered = not any(kw in all_text for kw in edu_keywords)
        
        elif rule.id == "fv_no_stepping_stone":
            # Check for stepping stone
            stepping_keywords = ["stepping stone", "pit stop", "revenue now", "interim product", "bridge"]
            is_triggered = not any(kw in all_text for kw in stepping_keywords)
        
        elif rule.id == "fv_no_believers":
            # Check for true believers
            believer_keywords = ["believer", "early adopter", "evangelist", "champion", "gets it", "sees the vision"]
            is_triggered = not any(kw in all_text for kw in believer_keywords)
        
        elif rule.id == "fv_short_runway":
            # Check for runway info - this is a special case, always warn if no runway mentioned
            runway_keywords = ["runway", "months of cash", "funding", "burn rate", "survival"]
            is_triggered = not any(kw in all_text for kw in runway_keywords)
        
        # Default: mark as not triggered for rules we don't have specific logic for
        
        if is_triggered:
            triggered_rules.append({
                **rule.to_dict(),
                "triggered": True,
            })
    
    # Sort by severity
    severity_order = {"blocker": 0, "warning": 1, "info": 2}
    triggered_rules.sort(key=lambda r: severity_order.get(r["severity"], 3))
    
    return triggered_rules


def get_playbook_status(
    pmf_path: str,
    graph_state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Get the overall playbook status including triggered rules and next actions.
    """
    playbook = PLAYBOOKS.get(pmf_path)
    if not playbook:
        return {
            "path": None,
            "status": "no_path",
            "message": "No PMF path selected. Complete onboarding to get your playbook.",
        }
    
    triggered_rules = evaluate_playbook_rules(pmf_path, graph_state)
    blockers = [r for r in triggered_rules if r["severity"] == "blocker"]
    warnings = [r for r in triggered_rules if r["severity"] == "warning"]
    
    # Determine overall status
    if len(blockers) > 0:
        status = "blockers_present"
        message = f"You have {len(blockers)} critical issue(s) to address for your {playbook.name} strategy."
    elif len(warnings) > 0:
        status = "warnings_present"
        message = f"You have {len(warnings)} warning(s) to review for your {playbook.name} strategy."
    else:
        status = "on_track"
        message = f"You're on track with your {playbook.name} strategy."
    
    return {
        "path": pmf_path,
        "playbook": get_playbook_summary(pmf_path),
        "status": status,
        "message": message,
        "blockers": blockers,
        "warnings": warnings,
        "triggered_rules": triggered_rules,
        "total_rules": len(playbook.rules),
        "triggered_count": len(triggered_rules),
    }
