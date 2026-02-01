"""
OpenRouter Service
Handles communication with OpenRouter API for LLM interactions
"""

import os
import json
import httpx
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class OpenRouterModel(str, Enum):
    """Available models on OpenRouter"""
    GPT_4O = "openai/gpt-4o"
    GPT_4O_MINI = "openai/gpt-4o-mini"
    CLAUDE_3_5_SONNET = "anthropic/claude-3.5-sonnet"
    CLAUDE_3_HAIKU = "anthropic/claude-3-haiku"
    LLAMA_3_70B = "meta-llama/llama-3-70b-instruct"
    MIXTRAL_8X7B = "mistralai/mixtral-8x7b-instruct"
    GEMINI_PRO = "google/gemini-pro"


@dataclass
class Message:
    """Chat message"""
    role: str  # 'system', 'user', 'assistant'
    content: str


@dataclass
class OpenRouterResponse:
    """Response from OpenRouter API"""
    content: str
    model: str
    usage: Dict[str, int]
    finish_reason: str


class OpenRouterService:
    """Service for interacting with OpenRouter API"""
    
    BASE_URL = "https://openrouter.ai/api/v1"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "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")
        self.default_model = OpenRouterModel.GPT_4O_MINI
        
    async def chat(
        self,
        messages: List[Message],
        model: Optional[OpenRouterModel] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> OpenRouterResponse:
        """Send a chat completion request to OpenRouter"""
        
        model = model or self.default_model
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5177",
            "X-Title": "Ideograph",
        }
        
        payload = {
            "model": model.value if isinstance(model, OpenRouterModel) else model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()
        
        choice = data["choices"][0]
        return OpenRouterResponse(
            content=choice["message"]["content"],
            model=data.get("model", model),
            usage=data.get("usage", {}),
            finish_reason=choice.get("finish_reason", "stop"),
        )
    
    async def analyze_startup_input(self, user_input: str) -> Dict[str, Any]:
        """Analyze user input about their startup idea"""
        
        system_prompt = """You are an expert startup advisor analyzing user input about their business idea.
Your task is to:
1. Extract key claims, facts, and evidence from the input
2. Identify which framework categories the input relates to (market, problem, solution, timing, founder, competition, business_model, gtm)
3. Generate follow-up questions to clarify vague statements
4. Assess confidence levels for extracted information

Respond in JSON format with this structure:
{
    "extracted_nodes": [
        {
            "type": "claim|fact|evidence",
            "title": "short title",
            "content": "detailed content",
            "confidence": 0-100,
            "framework_category": "market|problem|solution|timing|founder|competition|business_model|gtm",
            "source": "user_input|inferred"
        }
    ],
    "follow_up_questions": [
        {
            "question": "the question text",
            "priority": "high|medium|low",
            "category": "framework category this relates to",
            "reason": "why this question is important"
        }
    ],
    "summary": "brief summary of the analysis",
    "overall_confidence": 0-100
}"""

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=f"Analyze this startup input:\n\n{user_input}")
        ]
        
        response = await self.chat(messages, temperature=0.3)
        
        # Parse JSON response
        try:
            # Find JSON in response (handle markdown code blocks)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            result["raw_response"] = response.content
            result["model_used"] = response.model
            return result
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse LLM response",
                "raw_response": response.content,
                "extracted_nodes": [],
                "follow_up_questions": [],
                "summary": response.content,
                "overall_confidence": 50,
            }
    
    async def generate_follow_up_questions(
        self,
        context: str,
        existing_nodes: List[Dict[str, Any]],
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate follow-up questions based on context and existing knowledge"""
        
        existing_summary = "\n".join([
            f"- [{n.get('type', 'unknown')}] {n.get('title', 'Untitled')}: {n.get('content', '')[:100]}..."
            for n in existing_nodes[:10]  # Limit to 10 nodes for context
        ])
        
        category_filter = f"\nFocus on questions related to: {category}" if category else ""
        
        system_prompt = f"""You are a startup advisor helping founders validate their ideas.
Generate insightful follow-up questions to help gather more information.

Current knowledge about the startup:
{existing_summary}
{category_filter}

Generate 3-5 follow-up questions that would help validate or challenge the startup idea.
Focus on areas that are unclear, unvalidated, or potentially risky.

Respond in JSON format:
{{
    "questions": [
        {{
            "question": "the question text",
            "priority": "high|medium|low",
            "category": "market|problem|solution|timing|founder|competition|business_model|gtm",
            "intent": "validate|challenge|clarify|explore"
        }}
    ]
}}"""

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=f"Generate follow-up questions for this context:\n\n{context}")
        ]
        
        response = await self.chat(messages, temperature=0.5)
        
        try:
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            return result.get("questions", [])
        except json.JSONDecodeError:
            return []
    
    async def evaluate_claim(
        self,
        claim: str,
        supporting_evidence: List[str],
        contradicting_evidence: List[str],
    ) -> Dict[str, Any]:
        """Evaluate a claim based on available evidence"""
        
        system_prompt = """You are an expert at evaluating startup claims based on evidence.
Analyze the claim and the provided evidence to assess its validity.

Respond in JSON format:
{
    "assessment": "supported|contradicted|inconclusive|needs_more_evidence",
    "confidence": 0-100,
    "reasoning": "explanation of your assessment",
    "key_factors": ["list of key factors that influenced your assessment"],
    "recommendations": ["what would strengthen or weaken this claim"]
}"""

        evidence_text = f"""
Claim: {claim}

Supporting Evidence:
{chr(10).join(f'- {e}' for e in supporting_evidence) if supporting_evidence else '(none provided)'}

Contradicting Evidence:
{chr(10).join(f'- {e}' for e in contradicting_evidence) if contradicting_evidence else '(none provided)'}
"""

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=evidence_text)
        ]
        
        response = await self.chat(messages, temperature=0.3)
        
        try:
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content.strip())
        except json.JSONDecodeError:
            return {
                "assessment": "inconclusive",
                "confidence": 50,
                "reasoning": response.content,
                "key_factors": [],
                "recommendations": [],
            }
    
    async def suggest_connections(
        self,
        new_node: Dict[str, Any],
        existing_nodes: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Suggest connections between a new node and existing nodes"""
        
        existing_summary = "\n".join([
            f"- ID: {n.get('id', 'unknown')} | Type: {n.get('type', 'unknown')} | Title: {n.get('title', 'Untitled')} | Content: {n.get('content', '')[:100]}..."
            for n in existing_nodes[:20]
        ])
        
        system_prompt = f"""You are analyzing a knowledge graph for a startup evaluation tool.
Given a new node and existing nodes, suggest meaningful connections.

Existing nodes:
{existing_summary}

Connection types available:
- supports: The new node provides evidence supporting an existing claim
- contradicts: The new node contradicts an existing claim
- depends_on: The new node depends on an existing node being true
- informs: The new node provides relevant information to an existing node

Respond in JSON format:
{{
    "suggested_connections": [
        {{
            "target_id": "id of existing node to connect to",
            "connection_type": "supports|contradicts|depends_on|informs",
            "confidence": 0-100,
            "reasoning": "why this connection makes sense"
        }}
    ]
}}"""

        new_node_text = f"""
New Node:
- Type: {new_node.get('type', 'unknown')}
- Title: {new_node.get('title', 'Untitled')}
- Content: {new_node.get('content', '')}
"""

        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=new_node_text)
        ]
        
        response = await self.chat(messages, temperature=0.3)
        
        try:
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            return result.get("suggested_connections", [])
        except json.JSONDecodeError:
            return []


# Singleton instance
_openrouter_service: Optional[OpenRouterService] = None


def get_openrouter_service() -> OpenRouterService:
    """Get or create the OpenRouter service singleton"""
    global _openrouter_service
    if _openrouter_service is None:
        _openrouter_service = OpenRouterService()
    return _openrouter_service
