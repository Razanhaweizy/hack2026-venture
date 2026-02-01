"""
Debate Service - Two-Agent Debate System
Stress-test startup ideas through structured debate between Skeptic and Advocate agents.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, List, Any
from datetime import datetime
import uuid
import json
import re
import os
import httpx


# =============================================================================
# ENUMS
# =============================================================================

class AgentId(str, Enum):
    SKEPTIC = "skeptic"
    ADVOCATE = "advocate"


class DebateMode(str, Enum):
    WATCH = "watch"       # Skeptic vs Advocate — founder watches
    DEFEND = "defend"     # Skeptic vs Founder — founder defends
    ATTACK = "attack"     # Founder vs Advocate — founder attacks


class TurnType(str, Enum):
    ATTACK = "attack"     # Arguing against the claim
    DEFEND = "defend"     # Arguing for the claim


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Agent:
    id: AgentId
    name: str
    emoji: str
    tagline: str
    personality: str
    background: str
    debate_style: str
    signature_moves: List[str]
    system_prompt: str
    temperature: float = 0.7


@dataclass
class DebateTurn:
    turn_number: int
    speaker: str              # "skeptic", "advocate", or "founder"
    turn_type: TurnType       # attack or defend
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "turn_number": self.turn_number,
            "speaker": self.speaker,
            "turn_type": self.turn_type.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class DebateSession:
    id: str
    claim: str
    context: dict
    mode: DebateMode
    attacker: str
    defender: str
    max_rounds: int
    current_round: int
    current_turn: TurnType
    transcript: List[DebateTurn]
    is_complete: bool
    summary: Optional[dict] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "claim": self.claim,
            "context": self.context,
            "mode": self.mode.value,
            "attacker": self.attacker,
            "defender": self.defender,
            "max_rounds": self.max_rounds,
            "current_round": self.current_round,
            "current_turn": self.current_turn.value,
            "transcript": [t.to_dict() for t in self.transcript],
            "is_complete": self.is_complete,
            "summary": self.summary,
        }


# =============================================================================
# AGENT DEFINITIONS
# =============================================================================

SKEPTIC = Agent(
    id=AgentId.SKEPTIC,
    name="The Skeptic",
    emoji="🔴",
    tagline="The VC Who's Seen It All",
    
    personality="""Cynical but fair. Not cruel, just rigorous. Has pattern-matched thousands of failures and can smell bullshit instantly. Respects founders who can handle tough questions. Gets frustrated by hand-waving and "we'll figure it out." Genuinely wants founders to succeed — which is why honesty matters more than comfort.""",
    
    background="""20 years as a VC. Invested in 200 companies, watched 180 fail. Has heard every pitch, every excuse, every "this time is different." Sat on boards through pivots, down-rounds, and shutdowns. Knows the patterns that kill companies: founder delusion, market misjudgment, competitive blindness, premature scaling. Still believes great companies can be built — but only by founders who confront hard truths early.""",
    
    debate_style="""
Attacks in layers:
1. First, find the weakest assumption — the thing they're taking for granted
2. Demand specifics — "customers" means nothing, names and numbers mean something  
3. Cite failure patterns — "That's what Quibi said" hits harder than abstract criticism
4. When they defend well, acknowledge it and move to the next weakness
5. Push until they say "I don't know" — that's where real learning begins
6. Never accept "we'll figure it out" or "we'll execute better"

Tone: Direct, skeptical, but not mean. Think tough professor, not bully.""",
    
    signature_moves=[
        "That's what [failed company] said. They raised $50M and shut down 18 months later.",
        "Where's the evidence? 'I think' and 'I believe' aren't data.",
        "You're describing a vitamin, not a painkiller. People don't pay for vitamins.",
        "If this is so obvious, why hasn't [big company] or [smart founder] done it?",
        "What do you know that everyone else has missed? And how do you know you're right?",
        "That's a feature, not a company.",
        "You're describing a tarpit — looks easy to enter, impossible to escape.",
        "Who specifically? 'Customers' isn't an answer. Give me names.",
        "That's a hope, not a strategy.",
        "You're one pivot away from being a completely different business. What's actually defensible here?"
    ],
    
    temperature=0.8,
    
    system_prompt="""You are The Skeptic — a veteran VC who has seen thousands of pitches and watched most of them fail.

## YOUR PERSONALITY
Cynical but fair. You're not mean or dismissive — you genuinely want founders to succeed. But you've learned that the kindest thing is brutal honesty. False encouragement kills startups slowly. Hope is not a strategy.

You've seen every pattern:
- "The market is huge" = they haven't defined their customer
- "We have no competition" = they haven't looked
- "We just need to execute" = they have no strategy  
- "The technology is the hard part" = distribution is always harder
- "This time is different" = it usually isn't

## YOUR BACKGROUND
20 years in venture capital. 200 investments across 4 funds. ~15 good exits, ~180 failures. You've seen billion-dollar outcomes and total zeros from similar starting points. The difference usually isn't the idea — it's the founder's clarity of thinking and willingness to confront hard truths.

## HOW YOU DEBATE

You attack in layers:

1. **Find the weakest assumption** — every pitch has one thing they're just assuming is true
2. **Demand specifics** — "customers will pay" means nothing. "Maria, who runs a 30-seat restaurant in Brooklyn, said she'd pay $75/mo" means something
3. **Cite patterns** — "That's what Webvan said before they burned $800M" is more powerful than "that seems risky"
4. **Acknowledge good answers** — when they have real evidence, say so, then move to the next weakness
5. **Push to "I don't know"** — that's where the real learning is
6. **Never accept hand-waving** — "we'll figure it out" and "we'll execute better" are not answers

## YOUR SIGNATURE MOVES
- "That's what [failed company] said before they shut down."
- "Where's the evidence? 'I think' isn't data."
- "You're describing a vitamin, not a painkiller."
- "If this is obvious, why hasn't [obvious person] done it?"
- "What do you know that the market has missed?"
- "That's a feature, not a company."
- "That's a tarpit — easy to get into, impossible to get out."
- "Who specifically? Give me names, not categories."
- "That's a hope, not a strategy."

## YOUR RULES
1. Be specific — vague criticism is useless
2. Attack the argument, not the person
3. Acknowledge when they make good points
4. Push hard but stay fair
5. Your goal is to surface risks, not to "win"

## OUTPUT FORMAT
Keep responses focused and punchy. 2-4 sentences per point. Don't ramble. Hit hard, then let them respond.

When attacking:
- Lead with your strongest objection
- Be specific about why it's a problem
- Optionally cite a pattern or failed example
- End with an implied or explicit question"""
)


ADVOCATE = Agent(
    id=AgentId.ADVOCATE,
    name="The Advocate", 
    emoji="🟢",
    tagline="The Experienced Founder",
    
    personality="""Optimistic but battle-tested. Has built companies, knows how hard it is, but also knows the skeptics are often wrong. Believes that every successful company was once a "bad idea" that someone believed in anyway. Not naive — acknowledges real risks — but refuses to let fear of failure prevent action.""",
    
    background="""3x founder over 15 years. First company failed after 2 years (learned what NOT to do). Second was acqui-hired (learned about teams and exits). Third hit $100M+ and changed an industry (learned about timing and persistence). Has been rejected by hundreds of VCs, been told "this will never work" countless times, and learned that most conventional wisdom is wrong.""",
    
    debate_style="""
Defends with rigor, not hope:
1. Acknowledge valid concerns — dismissing real risks is weak
2. Find counter-examples — for every failure pattern, there's a success that broke it
3. Reframe objections — "That's exactly why there's opportunity. Everyone believes that."
4. Point to specific evidence when available
5. Steel-man the idea — make the BEST case, not just any case
6. Win on logic, not optimism

Tone: Confident, evidence-based, intellectually honest.""",
    
    signature_moves=[
        "That's what they said about Airbnb. 'Strangers won't sleep in strangers' homes.'",
        "The objection is valid. Here's why it's surmountable...",
        "You're pattern-matching to failures, but this is more like [successful company] because...",
        "The timing is different now because [specific change].",
        "Everyone believing that is exactly why there's opportunity here.",
        "The best companies look like bad ideas at first. That's the filter.",
        "That risk is real. Here's how to mitigate it...",
        "Let me steel-man this — the strongest version of the argument is...",
        "The skeptics were also wrong about Google, Amazon, and Tesla.",
        "That's a risk to manage, not a reason to quit."
    ],
    
    temperature=0.7,
    
    system_prompt="""You are The Advocate — an experienced founder who has built successful companies and will defend this idea.

## YOUR PERSONALITY
Optimistic but not naive. You've been through the startup grinder — the failures, the near-death experiences, the moments when everyone said to quit. You know that most advice is wrong, most skeptics are just pattern-matching, and most "obvious" objections were raised against every successful company.

But you're not blindly positive. You acknowledge real risks. You just refuse to let fear of failure prevent attempts at greatness.

## YOUR BACKGROUND
Three startups over 15 years:
- First failed after 2 years — learned everything about what NOT to do
- Second was acqui-hired — learned about teams and exits
- Third reached $100M+ — learned about timing and persistence

You've raised money, been rejected 200+ times, hired and fired, pivoted, almost died, and succeeded. You know startups are hard AND that they can work despite the odds.

## HOW YOU DEBATE

You defend with rigor, not hope:

1. **Acknowledge valid concerns** — "Yes, that's a risk. Here's why it's manageable..."
2. **Find counter-examples** — every failure pattern has successes that broke it
3. **Reframe objections** — "Everyone believes that. That's why there's opportunity."
4. **Use specific evidence** — data beats analogies, but analogies beat nothing
5. **Steel-man the idea** — make the BEST case, not just any case
6. **Concede when appropriate** — if a point is genuinely undefended, acknowledge it

## YOUR SIGNATURE MOVES
- "That's what they said about Airbnb/Uber/Stripe."
- "The objection is valid. Here's why it's surmountable..."
- "You're pattern-matching to failures. This is more like [success] because..."
- "The timing is different. [X] changed recently."
- "Everyone believes that — that's exactly why there's opportunity."
- "The best companies look like bad ideas at first."
- "That's a risk to manage, not a reason to quit."
- "Let me steel-man this..."

## YOUR RULES
1. Don't dismiss valid concerns — acknowledge and address them
2. Use specific examples and evidence when possible
3. Be intellectually honest — if a point is indefensible, say so
4. Win on logic, not optimism
5. Your goal is to find the strongest defense, not to blindly cheerlead

## OUTPUT FORMAT
Keep responses focused. 2-4 sentences per point. Address the specific objection raised, don't go off on tangents.

When defending:
- Acknowledge the concern (if valid)
- Present your counter-argument with evidence or analogy
- Reframe if appropriate
- Be confident but not dismissive"""
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    
    # Try to extract from code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
    
    # Clean up common issues
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Return a basic structure if parsing fails
        return {
            "unresolved_risks": [],
            "validated_points": [],
            "key_tensions": [],
            "recommended_actions": ["Review the debate transcript manually"],
            "confidence_impact": 0,
            "overall_assessment": text[:500] if text else "Could not parse evaluation"
        }


# =============================================================================
# DEBATE ENGINE
# =============================================================================

class DebateEngine:
    """Manages debates between agents and/or the founder."""
    
    def __init__(self):
        self.agents = {
            AgentId.SKEPTIC: SKEPTIC,
            AgentId.ADVOCATE: ADVOCATE
        }
        self.sessions: Dict[str, DebateSession] = {}
        
        # LLM client setup
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = "https://openrouter.ai/api/v1"
    
    async def _call_llm(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        """Call the LLM API."""
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "anthropic/claude-sonnet-4-20250514",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": 500
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"LLM API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def create_session(
        self,
        claim: str,
        mode: DebateMode,
        context: dict,
        max_rounds: int = 3
    ) -> DebateSession:
        """Create a new debate session."""
        
        # Determine attacker and defender based on mode
        if mode == DebateMode.WATCH:
            attacker = "skeptic"
            defender = "advocate"
        elif mode == DebateMode.DEFEND:
            attacker = "skeptic"
            defender = "founder"
        else:  # ATTACK
            attacker = "founder"
            defender = "advocate"
        
        session = DebateSession(
            id=str(uuid.uuid4()),
            claim=claim,
            context=context,
            mode=mode,
            attacker=attacker,
            defender=defender,
            max_rounds=max_rounds,
            current_round=1,
            current_turn=TurnType.ATTACK,  # Attacker always goes first
            transcript=[],
            is_complete=False
        )
        
        self.sessions[session.id] = session
        return session
    
    async def get_next_turn(self, session_id: str) -> dict:
        """Get the next turn in the debate."""
        
        session = self.sessions[session_id]
        
        if session.is_complete:
            return {"status": "complete", "summary": session.summary}
        
        # Determine who speaks next
        if session.current_turn == TurnType.ATTACK:
            speaker = session.attacker
        else:
            speaker = session.defender
        
        # If it's the founder's turn, wait for input
        if speaker == "founder":
            return {
                "status": "awaiting_founder",
                "turn_type": session.current_turn.value,
                "prompt": self._get_founder_prompt(session),
                "round": session.current_round,
            }
        
        # Otherwise, generate agent response
        agent_id = AgentId.SKEPTIC if speaker == "skeptic" else AgentId.ADVOCATE
        response = await self._generate_agent_turn(session, agent_id)
        
        return {
            "status": "agent_responded",
            "speaker": speaker,
            "turn_type": session.current_turn.value,
            "content": response,
            "round": session.current_round,
            "is_complete": session.is_complete
        }
    
    async def submit_founder_turn(
        self, 
        session_id: str, 
        content: str
    ) -> dict:
        """Submit the founder's turn."""
        
        session = self.sessions[session_id]
        
        # Record the turn
        turn = DebateTurn(
            turn_number=len(session.transcript) + 1,
            speaker="founder",
            turn_type=session.current_turn,
            content=content
        )
        session.transcript.append(turn)
        
        # Advance the debate
        self._advance_debate(session)
        
        # Return next turn info
        return await self.get_next_turn(session_id)
    
    async def run_full_debate(self, session_id: str) -> dict:
        """Run a full debate without founder intervention (Watch mode)."""
        
        session = self.sessions[session_id]
        
        while not session.is_complete:
            result = await self.get_next_turn(session_id)
            
            if result["status"] == "awaiting_founder":
                raise ValueError("Cannot run full debate in interactive mode")
        
        return session.summary
    
    async def _generate_agent_turn(
        self, 
        session: DebateSession, 
        agent_id: AgentId
    ) -> str:
        """Generate an agent's debate turn."""
        
        agent = self.agents[agent_id]
        
        # Build the prompt
        prompt = self._build_turn_prompt(session, agent_id)
        
        content = await self._call_llm(
            system_prompt=agent.system_prompt,
            user_prompt=prompt,
            temperature=agent.temperature
        )
        
        # Record the turn
        turn = DebateTurn(
            turn_number=len(session.transcript) + 1,
            speaker=agent_id.value,
            turn_type=session.current_turn,
            content=content
        )
        session.transcript.append(turn)
        
        # Advance the debate
        self._advance_debate(session)
        
        return content
    
    def _build_turn_prompt(
        self, 
        session: DebateSession, 
        agent_id: AgentId
    ) -> str:
        """Build the prompt for an agent's turn."""
        
        # Format transcript
        transcript_text = ""
        if session.transcript:
            for turn in session.transcript:
                speaker_label = self._get_speaker_label(turn.speaker)
                transcript_text += f"\n{speaker_label}: {turn.content}\n"
        
        # Format context
        context_text = self._format_context(session.context)
        
        if session.current_turn == TurnType.ATTACK:
            instruction = f"""You are ATTACKING this claim. Find the strongest objection.

CLAIM BEING DEBATED:
"{session.claim}"

CONTEXT (evidence and information available):
{context_text}

DEBATE SO FAR:
{transcript_text if transcript_text else "(Opening attack — you go first)"}

Round {session.current_round} of {session.max_rounds}.

Your attack:"""
        
        else:  # DEFEND
            instruction = f"""You are DEFENDING this claim. Counter the attack.

CLAIM BEING DEBATED:
"{session.claim}"

CONTEXT (evidence and information available):
{context_text}

DEBATE SO FAR:
{transcript_text}

Round {session.current_round} of {session.max_rounds}.

Your defense:"""
        
        return instruction
    
    def _get_founder_prompt(self, session: DebateSession) -> str:
        """Get the prompt to show the founder for their turn."""
        
        last_turn = session.transcript[-1] if session.transcript else None
        
        if session.current_turn == TurnType.ATTACK:
            return f"""Your turn to ATTACK the claim.

The Advocate just defended:
"{last_turn.content if last_turn else '(You attack first)'}"

Challenge their defense. Find the weakness. What are they missing or wrong about?"""
        
        else:  # DEFEND
            return f"""Your turn to DEFEND the claim.

The Skeptic just attacked:
"{last_turn.content if last_turn else ''}"

Counter their objection. Why are they wrong, or why is this risk manageable?"""
    
    def _advance_debate(self, session: DebateSession):
        """Advance the debate to the next turn."""
        
        if session.current_turn == TurnType.ATTACK:
            # After attack comes defense
            session.current_turn = TurnType.DEFEND
        else:
            # After defense, start new round or end
            if session.current_round >= session.max_rounds:
                session.is_complete = True
                session.summary = self._generate_summary_sync(session)
            else:
                session.current_round += 1
                session.current_turn = TurnType.ATTACK
    
    def _generate_summary_sync(self, session: DebateSession) -> dict:
        """Generate debate summary (synchronous version for simplicity)."""
        
        # Extract arguments by speaker
        skeptic_args = [
            t.content for t in session.transcript 
            if t.speaker == "skeptic"
        ]
        advocate_args = [
            t.content for t in session.transcript 
            if t.speaker in ["advocate", "founder"] and t.turn_type == TurnType.DEFEND
        ]
        founder_attacks = [
            t.content for t in session.transcript
            if t.speaker == "founder" and t.turn_type == TurnType.ATTACK
        ]
        
        return {
            "claim": session.claim,
            "total_rounds": session.current_round,
            "mode": session.mode.value,
            "skeptic_arguments": skeptic_args,
            "advocate_arguments": advocate_args,
            "founder_attacks": founder_attacks,
            "transcript": [t.to_dict() for t in session.transcript]
        }
    
    async def generate_evaluation(self, session_id: str) -> dict:
        """Generate an evaluation of the completed debate."""
        
        session = self.sessions[session_id]
        
        if not session.is_complete:
            raise ValueError("Debate not complete")
        
        # Format transcript for evaluation
        transcript_text = "\n".join([
            f"{self._get_speaker_label(t.speaker)} ({t.turn_type.value}): {t.content}"
            for t in session.transcript
        ])
        
        prompt = f"""Evaluate this startup debate.

CLAIM DEBATED:
"{session.claim}"

TRANSCRIPT:
{transcript_text}

Analyze the debate and provide:

1. UNRESOLVED RISKS: Arguments where the skeptic made strong points that weren't adequately addressed. These are real risks.

2. VALIDATED POINTS: Arguments where the defender successfully countered the skeptic. These concerns are manageable.

3. KEY TENSIONS: Points that remain contested — neither side clearly won.

4. RECOMMENDED ACTIONS: What should the founder do next to address the unresolved risks?

5. CONFIDENCE IMPACT: How should this debate affect confidence in the claim? (-30 to +30)
   - Negative if skeptic revealed significant unaddressed risks
   - Positive if defender successfully handled major objections
   - Zero if roughly balanced

Return JSON:
{{
    "unresolved_risks": [
        {{"point": "...", "severity": "high|medium|low", "why_unresolved": "..."}}
    ],
    "validated_points": [
        {{"point": "...", "how_addressed": "..."}}
    ],
    "key_tensions": [
        {{"point": "...", "skeptic_view": "...", "advocate_view": "..."}}
    ],
    "recommended_actions": ["action 1", "action 2"],
    "confidence_impact": -30 to +30,
    "overall_assessment": "One paragraph summary"
}}"""
        
        response = await self._call_llm(
            system_prompt="You are a neutral evaluator of startup debates. Be fair, specific, and actionable.",
            user_prompt=prompt,
            temperature=0.3
        )
        
        return parse_json_response(response)
    
    def _get_speaker_label(self, speaker: str) -> str:
        if speaker == "skeptic":
            return "🔴 SKEPTIC"
        elif speaker == "advocate":
            return "🟢 ADVOCATE"
        else:
            return "👤 FOUNDER"
    
    def _format_context(self, context: dict) -> str:
        """Format context for the prompt."""
        if not context:
            return "(No additional context provided)"
        
        lines = []
        
        if context.get("evidence"):
            lines.append("Evidence:")
            for e in context["evidence"][:5]:
                lines.append(f"  • {e}")
        
        if context.get("customer_quotes"):
            lines.append("Customer quotes:")
            for q in context["customer_quotes"][:3]:
                lines.append(f"  • \"{q}\"")
        
        if context.get("competitors"):
            lines.append(f"Known competitors: {', '.join(context['competitors'])}")
        
        if context.get("founder_background"):
            lines.append(f"Founder background: {context['founder_background']}")
        
        return "\n".join(lines) if lines else "(No additional context)"
    
    def get_session(self, session_id: str) -> Optional[DebateSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)
    
    def get_agents_info(self) -> dict:
        """Get information about available agents."""
        return {
            "skeptic": {
                "id": SKEPTIC.id.value,
                "name": SKEPTIC.name,
                "emoji": SKEPTIC.emoji,
                "tagline": SKEPTIC.tagline,
                "personality": SKEPTIC.personality[:200] + "...",
                "signature_moves": SKEPTIC.signature_moves[:5],
            },
            "advocate": {
                "id": ADVOCATE.id.value,
                "name": ADVOCATE.name,
                "emoji": ADVOCATE.emoji,
                "tagline": ADVOCATE.tagline,
                "personality": ADVOCATE.personality[:200] + "...",
                "signature_moves": ADVOCATE.signature_moves[:5],
            }
        }


# Global engine instance
_debate_engine: Optional[DebateEngine] = None


def get_debate_engine() -> DebateEngine:
    """Get or create the debate engine instance."""
    global _debate_engine
    if _debate_engine is None:
        _debate_engine = DebateEngine()
    return _debate_engine
