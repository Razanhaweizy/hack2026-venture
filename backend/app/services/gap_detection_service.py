"""
Gap Detection Service
Analyzes the knowledge graph to identify unanswered or underaddressed framework questions.

After every extraction, this service checks what's missing and prioritizes gaps
based on criticality and coverage score.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class Criticality(str, Enum):
    """How critical is addressing this gap to startup success"""
    KILLER = "killer"           # Missing this = startup will likely fail
    HIGH = "high"               # Major risk if not addressed
    MEDIUM = "medium"           # Important but survivable gaps
    LOW = "low"                 # Nice to have, not critical


@dataclass
class FrameworkQuestion:
    """Metadata about a framework question for gap analysis"""
    id: str
    question: str
    why_it_matters: str
    criticality: Criticality
    founder_trap: str
    probing_questions: List[str]


@dataclass 
class Gap:
    """Represents an unanswered or underaddressed framework question"""
    framework_id: str
    question: str
    why_it_matters: str
    criticality: str
    founder_trap: str
    probing_questions: List[str]
    coverage_score: float  # 0.0 = nothing, 1.0 = fully addressed
    connected_nodes: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "framework_id": self.framework_id,
            "question": self.question,
            "why_it_matters": self.why_it_matters,
            "criticality": self.criticality,
            "founder_trap": self.founder_trap,
            "probing_questions": self.probing_questions,
            "coverage_score": self.coverage_score,
            "connected_nodes_count": len(self.connected_nodes)
        }


# =============================================================================
# FRAMEWORK QUESTIONS DATABASE
# Rich metadata for each framework question to enable intelligent gap detection
# =============================================================================

FRAMEWORK_QUESTIONS: Dict[str, FrameworkQuestion] = {
    # --- MARKET ---
    "framework:market:size": FrameworkQuestion(
        id="framework:market:size",
        question="What is the Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM)?",
        why_it_matters="Investors need to see a path to a large outcome. If the market is too small, even 100% market share won't justify the risk/return profile VCs need.",
        criticality=Criticality.HIGH,
        founder_trap="Citing random large numbers without bottom-up analysis. '$50B market' means nothing without showing how you calculated it.",
        probing_questions=[
            "What's your bottom-up TAM calculation?",
            "How many potential customers exist and what will each pay?",
            "What's your realistic market share in 5 years?",
            "Is this market big enough to build a $1B company?"
        ]
    ),
    "framework:market:growth": FrameworkQuestion(
        id="framework:market:growth",
        question="How fast is this market growing? What's the CAGR? Is it accelerating or decelerating?",
        why_it_matters="Growing markets forgive mistakes. Shrinking markets punish even excellent execution. The rising tide effect is real.",
        criticality=Criticality.MEDIUM,
        founder_trap="Assuming current growth rates continue indefinitely. Markets mature, slow down, and get disrupted.",
        probing_questions=[
            "What industry reports show this growth rate?",
            "What's driving the growth?",
            "Are there any headwinds that could slow growth?",
            "What happens if market growth stalls?"
        ]
    ),
    "framework:market:structure": FrameworkQuestion(
        id="framework:market:structure",
        question="Is the market fragmented (many small players) or concentrated (few large players)?",
        why_it_matters="Fragmented markets are easier to enter but harder to dominate. Concentrated markets have distribution advantages but fierce competition.",
        criticality=Criticality.MEDIUM,
        founder_trap="Ignoring market structure when planning go-to-market. A fragmented market needs different tactics than a concentrated one.",
        probing_questions=[
            "Who are the top 5 players and what's their combined market share?",
            "Is the market consolidating or fragmenting?",
            "What's the minimum viable scale to compete?",
            "Are there regional variations in market structure?"
        ]
    ),
    "framework:market:why": FrameworkQuestion(
        id="framework:market:why",
        question="Why did you choose this market? What unique insight or connection do you have?",
        why_it_matters="Founder-market fit predicts success. Deep understanding of a market beats surface-level opportunity spotting.",
        criticality=Criticality.HIGH,
        founder_trap="Picking a market purely because it's 'hot' rather than having genuine insight or connection.",
        probing_questions=[
            "How long have you been thinking about this market?",
            "Do you know potential customers personally?",
            "What do you know that others don't?",
            "Why will you still care about this in 10 years?"
        ]
    ),
    
    # --- PROBLEM ---
    "framework:problem:who": FrameworkQuestion(
        id="framework:problem:who",
        question="Describe your target customer in detail. What segment experiences this problem most acutely?",
        why_it_matters="A vague customer definition leads to vague solutions. The more specific your ICP, the faster you'll find PMF.",
        criticality=Criticality.KILLER,
        founder_trap="'Everyone has this problem' = you don't know your customer. Narrow is better than broad.",
        probing_questions=[
            "Can you name 5 specific people who have this problem?",
            "What job title/role does your ideal customer have?",
            "What company size/type are they in?",
            "What triggers them to look for a solution?"
        ]
    ),
    "framework:problem:pain": FrameworkQuestion(
        id="framework:problem:pain",
        question="How painful is this problem? A '10' is a hair-on-fire emergency.",
        why_it_matters="Nice-to-solve problems don't get budget. Must-solve problems get credit cards out. Pain level determines willingness to pay.",
        criticality=Criticality.KILLER,
        founder_trap="Projecting your own pain onto customers. Just because you hate it doesn't mean they do.",
        probing_questions=[
            "What happens if customers ignore this problem?",
            "How much money/time do they lose to this problem?",
            "Have customers tried to build solutions themselves?",
            "Would they pay before the product is perfect?"
        ]
    ),
    "framework:problem:current_solution": FrameworkQuestion(
        id="framework:problem:current_solution",
        question="How do people solve this problem today? What workarounds, hacks, or alternatives exist?",
        why_it_matters="Current solutions are your real competition. Understanding them reveals what customers actually value.",
        criticality=Criticality.HIGH,
        founder_trap="Dismissing current solutions as 'dumb.' Customers chose them for a reason—understand why.",
        probing_questions=[
            "What Excel/manual workarounds do people use?",
            "Why haven't they switched to existing software solutions?",
            "How much time/money do they spend on workarounds?",
            "What would make them switch?"
        ]
    ),
    "framework:problem:frequency": FrameworkQuestion(
        id="framework:problem:frequency",
        question="How often do customers experience this problem? Daily? Weekly? Once a year?",
        why_it_matters="Frequency drives habit formation and willingness to adopt new tools. Daily problems create daily engagement.",
        criticality=Criticality.MEDIUM,
        founder_trap="Building for rare events and expecting frequent usage. Annual tax software isn't daily-use SaaS.",
        probing_questions=[
            "How often does this problem occur?",
            "Is there a pattern or trigger?",
            "Do they need your solution constantly or occasionally?",
            "What's the cost per occurrence?"
        ]
    ),
    "framework:problem:why_unsolved": FrameworkQuestion(
        id="framework:problem:why_unsolved",
        question="Why hasn't this problem been solved already? What prevented previous solutions?",
        why_it_matters="If smart people have tried and failed, you need a clear theory for why you'll succeed where they didn't.",
        criticality=Criticality.HIGH,
        founder_trap="Assuming you're the first to think of this. You're not. Someone tried before—find out why they failed.",
        probing_questions=[
            "Who else has tried to solve this?",
            "What happened to previous attempts?",
            "What's changed that makes a solution possible now?",
            "What technology/market shift enabled this?"
        ]
    ),
    
    # --- SOLUTION ---
    "framework:solution:what": FrameworkQuestion(
        id="framework:solution:what",
        question="Describe your product or service. What is it concretely?",
        why_it_matters="Clarity of product definition affects everything—engineering, marketing, sales. Fuzzy products fail.",
        criticality=Criticality.KILLER,
        founder_trap="Describing features instead of outcomes. Customers buy outcomes, not features.",
        probing_questions=[
            "What does a user do with your product in the first 5 minutes?",
            "What's the core workflow?",
            "What does it replace in their current workflow?",
            "Can you demo it today?"
        ]
    ),
    "framework:solution:different": FrameworkQuestion(
        id="framework:solution:different",
        question="Not just better—how is it fundamentally different? What's the 10x improvement?",
        why_it_matters="Marginally better doesn't overcome switching costs. You need a step-function improvement to pull customers away.",
        criticality=Criticality.KILLER,
        founder_trap="Listing features competitors don't have. Features can be copied. Fundamental differentiation can't.",
        probing_questions=[
            "What's the one thing you do that no one else can?",
            "Why is your approach fundamentally different?",
            "What would a customer say is your unfair advantage?",
            "Can competitors copy this easily?"
        ]
    ),
    "framework:solution:moat": FrameworkQuestion(
        id="framework:solution:moat",
        question="What makes this defensible? Network effects, data, brand, patents, regulatory, switching costs?",
        why_it_matters="Without a moat, success invites competition that erodes your advantage. Defensibility is how you keep what you build.",
        criticality=Criticality.HIGH,
        founder_trap="'We'll move faster' is not a moat. Speed is temporary. Real moats compound over time.",
        probing_questions=[
            "What gets stronger as you grow?",
            "What would it take for a competitor to copy you?",
            "Do you have any network effects?",
            "What data do you accumulate that improves the product?"
        ]
    ),
    "framework:solution:buildable": FrameworkQuestion(
        id="framework:solution:buildable",
        question="Do you have the technical ability to build this? What's the hardest part?",
        why_it_matters="Technical feasibility separates real opportunities from fantasies. Honest assessment prevents wasted time.",
        criticality=Criticality.HIGH,
        founder_trap="Underestimating technical complexity. 'It's just an app' has killed many startups.",
        probing_questions=[
            "Have you built a prototype?",
            "What's the hardest technical challenge?",
            "Do you need to hire to build the core product?",
            "Are there technical risks that could kill the project?"
        ]
    ),
    "framework:solution:v1": FrameworkQuestion(
        id="framework:solution:v1",
        question="What's the minimum viable product? What can you ship in weeks, not months?",
        why_it_matters="Speed to learning matters more than features. The faster you ship, the faster you learn if you're right.",
        criticality=Criticality.MEDIUM,
        founder_trap="Building the perfect V10 product instead of shipping an imperfect V1. Perfectionism is the enemy of progress.",
        probing_questions=[
            "What's the smallest thing you can ship to test the core hypothesis?",
            "What features can wait until after PMF?",
            "Can you fake any parts with manual processes?",
            "What's your timeline to first paying customer?"
        ]
    ),
    
    # --- TIMING ---
    "framework:timing:why_now": FrameworkQuestion(
        id="framework:timing:why_now",
        question="What makes now the right time? Why would this not have worked 5 years ago?",
        why_it_matters="Timing is one of the biggest factors in startup success. Too early is indistinguishable from wrong.",
        criticality=Criticality.HIGH,
        founder_trap="'The market is finally ready' without explaining what changed. Markets don't just 'become ready.'",
        probing_questions=[
            "What was missing 5 years ago that exists now?",
            "What technology/regulatory/behavior shift enabled this?",
            "Are there early adopters already demonstrating demand?",
            "What signals tell you the timing is right?"
        ]
    ),
    "framework:timing:change": FrameworkQuestion(
        id="framework:timing:change",
        question="What recent shift enabled this opportunity? Technology, regulation, behavior, cost?",
        why_it_matters="Understanding the enabling change helps you ride the wave correctly and predict future shifts.",
        criticality=Criticality.MEDIUM,
        founder_trap="Citing long-term trends instead of recent inflection points. 'Mobile is growing' isn't timing.",
        probing_questions=[
            "What specific event or trend created this opportunity?",
            "Is this change accelerating or stabilizing?",
            "How does this change affect your customers specifically?",
            "What secondary changes does this create?"
        ]
    ),
    "framework:timing:window": FrameworkQuestion(
        id="framework:timing:window",
        question="How long is the window? Is this a land grab or can you take your time?",
        why_it_matters="Window size determines your strategy. Short windows require speed; long windows allow perfection.",
        criticality=Criticality.MEDIUM,
        founder_trap="Rushing when there's time or dawdling when there's not. Match urgency to actual window.",
        probing_questions=[
            "How long until competitors notice this opportunity?",
            "Are there first-mover advantages here?",
            "What happens if you're 2 years late?",
            "Is the window opening or already open?"
        ]
    ),
    "framework:timing:late": FrameworkQuestion(
        id="framework:timing:late",
        question="What happens if you're 2 years late? Does the opportunity disappear or just shrink?",
        why_it_matters="Understanding late-entry scenarios helps calibrate risk and urgency. Some opportunities are forgiving; others aren't.",
        criticality=Criticality.LOW,
        founder_trap="Artificial urgency that leads to poor decisions. Not everything is a race.",
        probing_questions=[
            "Could you still win if you started later?",
            "What would the competitive landscape look like?",
            "Are there second-mover advantages?",
            "What market share would still be available?"
        ]
    ),
    
    # --- FOUNDER ---
    "framework:founder:why_you": FrameworkQuestion(
        id="framework:founder:why_you",
        question="Why are you the right person to build this? What's your unique founder-market fit?",
        why_it_matters="Investors bet on people as much as ideas. Your unique advantages determine your odds of success.",
        criticality=Criticality.HIGH,
        founder_trap="Generic answers like 'I'm passionate and work hard.' Everyone says that. What's actually unique?",
        probing_questions=[
            "What do you know that other founders don't?",
            "Why will you outlast competitors?",
            "What in your background makes this inevitable for you?",
            "Why will you still be working on this when it's hard?"
        ]
    ),
    "framework:founder:domain": FrameworkQuestion(
        id="framework:founder:domain",
        question="What relevant domain expertise do you have? Years in industry, specific knowledge?",
        why_it_matters="Domain expertise compresses learning time. Experts see patterns novices miss.",
        criticality=Criticality.MEDIUM,
        founder_trap="Overvaluing tangential experience. 'I used the product as a customer' isn't the same as building in the space.",
        probing_questions=[
            "How many years have you worked in this industry?",
            "What non-obvious insights do you have?",
            "Who do you know that can help?",
            "What mistakes have you seen others make?"
        ]
    ),
    "framework:founder:technical": FrameworkQuestion(
        id="framework:founder:technical",
        question="Can you build the product yourself? What's your technical background?",
        why_it_matters="Technical founders iterate faster and make better product decisions. Non-technical founders need strong technical co-founders.",
        criticality=Criticality.MEDIUM,
        founder_trap="'I'll just hire developers' without understanding the complexity. Non-technical founders struggle to evaluate technical work.",
        probing_questions=[
            "Have you built software professionally?",
            "What's your tech stack experience?",
            "Can you evaluate technical decisions and hires?",
            "Do you have a technical co-founder?"
        ]
    ),
    "framework:founder:network": FrameworkQuestion(
        id="framework:founder:network",
        question="Do you have distribution or network advantages? Access to customers, partners, talent?",
        why_it_matters="Network advantages accelerate everything. Access to early customers, great hires, and key partners is often decisive.",
        criticality=Criticality.MEDIUM,
        founder_trap="Thinking network doesn't matter. Distribution often matters more than product.",
        probing_questions=[
            "Can you get 10 meetings with potential customers this week?",
            "Who would you hire first and can you get them?",
            "What partnerships could accelerate growth?",
            "Who are your trusted advisors in this space?"
        ]
    ),
    "framework:founder:gaps": FrameworkQuestion(
        id="framework:founder:gaps",
        question="What do you lack? Be honest about weaknesses and blind spots.",
        why_it_matters="Self-awareness about gaps enables you to address them. Blind spots become fatal flaws.",
        criticality=Criticality.MEDIUM,
        founder_trap="Claiming no weaknesses or only 'I work too hard.' Lack of self-awareness is a red flag.",
        probing_questions=[
            "What skill do you most need to develop?",
            "What type of help do you need to find?",
            "What decisions are you least qualified to make?",
            "What feedback do you most often receive?"
        ]
    ),
    "framework:founder:cofounder": FrameworkQuestion(
        id="framework:founder:cofounder",
        question="Do you need a co-founder? What profile would complement you?",
        why_it_matters="The right co-founder doubles your capabilities. The wrong one creates conflict. Solo founding is harder.",
        criticality=Criticality.LOW,
        founder_trap="Rushing into a co-founder relationship without vetting. Bad co-founder dynamics kill companies.",
        probing_questions=[
            "What skills do you need that you don't have?",
            "How would you split responsibilities?",
            "Do you know potential co-founders?",
            "How will you handle disagreements?"
        ]
    ),
    
    # --- COMPETITION ---
    "framework:competition:direct": FrameworkQuestion(
        id="framework:competition:direct",
        question="Who offers a similar solution to the same problem? What are their strengths and weaknesses?",
        why_it_matters="Understanding direct competition shapes positioning and identifies opportunities they're missing.",
        criticality=Criticality.HIGH,
        founder_trap="'We have no competition' means you haven't looked. There's always competition, even if indirect.",
        probing_questions=[
            "Who are the top 3 direct competitors?",
            "What do they do well?",
            "What do customers complain about?",
            "Why will customers choose you over them?"
        ]
    ),
    "framework:competition:indirect": FrameworkQuestion(
        id="framework:competition:indirect",
        question="What alternatives do customers use, even if not directly competing? Substitutes and workarounds?",
        why_it_matters="Indirect competition often takes more budget than direct competition. Excel is everyone's competitor.",
        criticality=Criticality.MEDIUM,
        founder_trap="Ignoring Excel, email, and manual processes as competitors. They are—and they're free.",
        probing_questions=[
            "What do people do instead of using a solution like yours?",
            "How much does the status quo cost them?",
            "What would make them switch from their current approach?",
            "What are the switching costs from current workarounds?"
        ]
    ),
    "framework:competition:failed": FrameworkQuestion(
        id="framework:competition:failed",
        question="Who tried this before and failed? Why did they fail? What can you learn from their autopsy?",
        why_it_matters="Learning from others' failures prevents repeating them. Failed startups leave useful postmortems.",
        criticality=Criticality.HIGH,
        founder_trap="Assuming previous failures mean the idea is bad. Often they just had bad timing or execution.",
        probing_questions=[
            "What companies in this space have shut down?",
            "What were their stated reasons for failure?",
            "What do former employees/customers say?",
            "What will you do differently?"
        ]
    ),
    "framework:competition:incumbents": FrameworkQuestion(
        id="framework:competition:incumbents",
        question="Why won't existing large players just add this feature or acquire you?",
        why_it_matters="Incumbents have resources and distribution. Understanding why they won't crush you is critical.",
        criticality=Criticality.HIGH,
        founder_trap="'They're too slow' isn't a real answer. Incumbents can move fast when motivated.",
        probing_questions=[
            "What prevents big companies from doing this?",
            "Is this too small for them to care about (now)?",
            "Would they rather build, buy, or partner?",
            "What would trigger them to compete with you?"
        ]
    ),
    
    # --- BUSINESS MODEL ---
    "framework:business_model:revenue": FrameworkQuestion(
        id="framework:business_model:revenue",
        question="How do you make money? Subscription, transaction, advertising, licensing?",
        why_it_matters="Revenue model affects everything—sales motion, customer success, growth strategy. Choose wisely.",
        criticality=Criticality.KILLER,
        founder_trap="'We'll figure out monetization later.' You need a hypothesis from day one.",
        probing_questions=[
            "What's your primary revenue stream?",
            "Are there secondary revenue opportunities?",
            "How does your model align with customer value?",
            "What's the revenue per customer target?"
        ]
    ),
    "framework:business_model:pricing": FrameworkQuestion(
        id="framework:business_model:pricing",
        question="How do you price? What's the pricing structure and how did you arrive at it?",
        why_it_matters="Pricing determines margins, customer selection, and competitive positioning. It's a strategic weapon.",
        criticality=Criticality.HIGH,
        founder_trap="Underpricing to win customers. You attract the wrong customers and can't sustain the business.",
        probing_questions=[
            "What's your pricing model (per seat, usage, flat fee)?",
            "How does this compare to alternatives?",
            "What value does the customer receive for this price?",
            "Have you tested pricing with potential customers?"
        ]
    ),
    "framework:business_model:unit_economics": FrameworkQuestion(
        id="framework:business_model:unit_economics",
        question="What are your CAC, LTV, and LTV:CAC ratio? Gross margins per customer?",
        why_it_matters="Unit economics determine if you can scale profitably. Bad unit economics can't be fixed by growth.",
        criticality=Criticality.KILLER,
        founder_trap="Ignoring unit economics while chasing growth. You can't outgrow bad math.",
        probing_questions=[
            "What does it cost to acquire a customer?",
            "What's the lifetime value of a customer?",
            "What's your gross margin per customer?",
            "When do you pay back CAC?"
        ]
    ),
    "framework:business_model:profitability": FrameworkQuestion(
        id="framework:business_model:profitability",
        question="What does the path to profitability look like? When and how do you become profitable?",
        why_it_matters="Understanding the path to profitability reveals sustainability. Investors want to see a clear path.",
        criticality=Criticality.MEDIUM,
        founder_trap="Assuming profitability is just 'later.' You need a concrete model for how it happens.",
        probing_questions=[
            "At what scale do you become profitable?",
            "What are the key drivers of profitability?",
            "What margins do you expect at scale?",
            "How much capital do you need to reach profitability?"
        ]
    ),
    
    # --- GTM ---
    "framework:gtm:pmf_type": FrameworkQuestion(
        id="framework:gtm:pmf_type",
        question="What type of Product-Market Fit are you pursuing? Hair on Fire, Hard Fact, or Future Vision?",
        why_it_matters="Different PMF types require different strategies. Hair on Fire needs speed; Future Vision needs education.",
        criticality=Criticality.MEDIUM,
        founder_trap="Not understanding which type of PMF you're pursuing. Strategy must match PMF type.",
        probing_questions=[
            "Is the problem urgent and obvious (Hair on Fire)?",
            "Are you riding a proven trend (Hard Fact)?",
            "Are you creating a new category (Future Vision)?",
            "How does this affect your go-to-market approach?"
        ]
    ),
    "framework:gtm:first_customers": FrameworkQuestion(
        id="framework:gtm:first_customers",
        question="Who are your first 10 customers? Do you have names and can you contact them today?",
        why_it_matters="Named customers prove demand isn't theoretical. If you can't list 10 targets, you don't know your customer.",
        criticality=Criticality.KILLER,
        founder_trap="'We'll find customers after we build.' You need customers before you build.",
        probing_questions=[
            "Can you list 10 specific people/companies?",
            "Do you have their contact information?",
            "Have you talked to any of them?",
            "Would any of them pay today for a prototype?"
        ]
    ),
    "framework:gtm:acquisition": FrameworkQuestion(
        id="framework:gtm:acquisition",
        question="What's your primary customer acquisition channel? Paid, organic, viral, sales, partnerships?",
        why_it_matters="Channel choice affects economics, speed, and scalability. Wrong channel = wrong customers or no customers.",
        criticality=Criticality.HIGH,
        founder_trap="'We'll try everything.' That's expensive and unfocused. Pick a primary channel and nail it.",
        probing_questions=[
            "Where do your target customers discover solutions?",
            "What's worked for similar products?",
            "What's your customer acquisition cost estimate?",
            "Can this channel scale with you?"
        ]
    ),
    "framework:gtm:sales_motion": FrameworkQuestion(
        id="framework:gtm:sales_motion",
        question="Is this self-serve, inside sales, field sales, or product-led? What's the typical sales cycle?",
        why_it_matters="Sales motion must match price point and customer type. Enterprise needs field sales; SMB needs self-serve.",
        criticality=Criticality.MEDIUM,
        founder_trap="Enterprise product with self-serve motion (or vice versa). Mismatch kills growth.",
        probing_questions=[
            "How much does a typical customer pay annually?",
            "How complex is the buying decision?",
            "Who makes the buying decision?",
            "How long is the typical sales cycle?"
        ]
    ),
    "framework:gtm:expansion": FrameworkQuestion(
        id="framework:gtm:expansion",
        question="How do you expand within accounts and to new segments? Land and expand plan?",
        why_it_matters="Expansion revenue is more profitable than new customer acquisition. Great companies expand after landing.",
        criticality=Criticality.LOW,
        founder_trap="Focusing only on new customers. Expansion within existing accounts is often easier and cheaper.",
        probing_questions=[
            "What would make a customer expand their usage?",
            "Are there other departments/teams who could use this?",
            "What's your net revenue retention target?",
            "How will you identify expansion opportunities?"
        ]
    ),
}


# =============================================================================
# PATH-SPECIFIC QUESTIONS
# Different PMF paths require different validation questions
# =============================================================================

PATH_SPECIFIC_QUESTIONS: Dict[str, Dict[str, FrameworkQuestion]] = {
    "hair_on_fire": {
        "hof:competitors_mapped": FrameworkQuestion(
            id="hof:competitors_mapped",
            question="Who are the top 3 competitors customers compare you to?",
            why_it_matters="Hair on Fire customers are actively evaluating options. If you don't know who they're comparing you to, you can't win the comparison.",
            criticality=Criticality.KILLER,
            founder_trap="'We have no competitors' = you don't understand your market. They're comparing you to SOMETHING.",
            probing_questions=[
                "What are customers currently Googling to find solutions?",
                "Who comes up when customers ask peers for recommendations?",
                "What's on their shortlist when they evaluate options?",
                "Why do you lose deals to specific competitors?"
            ]
        ),
        "hof:differentiation": FrameworkQuestion(
            id="hof:differentiation",
            question="What makes you DIFFERENT (not just better) from competitors?",
            why_it_matters="In a Hair on Fire market, 'better' isn't enough. Customers need a clear, memorable reason to pick you over known alternatives.",
            criticality=Criticality.KILLER,
            founder_trap="'We're faster/cheaper/easier' can be copied tomorrow. What's fundamentally different about your approach?",
            probing_questions=[
                "What would a customer say is your unfair advantage?",
                "What can you do that competitors structurally cannot?",
                "What tradeoff did you make that competitors won't?",
                "If a competitor tried to copy you, how long would it take?"
            ]
        ),
        "hof:speed_to_ship": FrameworkQuestion(
            id="hof:speed_to_ship",
            question="How fast can you ship? What's your iteration cycle?",
            why_it_matters="Speed wins in Hair on Fire markets. While you plan, competitors ship. Your competitor shipped while you read this.",
            criticality=Criticality.HIGH,
            founder_trap="'We need to get it right first' = you'll get outrun. Ship, learn, iterate.",
            probing_questions=[
                "How often do you deploy to production?",
                "What's your time from feature idea to customer hands?",
                "What slows you down the most?",
                "Can you ship something this week?"
            ]
        ),
        "hof:win_rate": FrameworkQuestion(
            id="hof:win_rate",
            question="What's your win rate against specific competitors?",
            why_it_matters="Win rate reveals whether your differentiation is actually working in real buying situations.",
            criticality=Criticality.HIGH,
            founder_trap="Not tracking win/loss by competitor. You need to know who you beat and who beats you.",
            probing_questions=[
                "What percentage of competitive deals do you win?",
                "Which competitor do you lose to most often and why?",
                "What reasons do lost deals give for choosing competitors?",
                "What's different about deals you win?"
            ]
        ),
    },
    "hard_fact": {
        "hf:trigger_event": FrameworkQuestion(
            id="hf:trigger_event",
            question="What event/pain triggers customers to finally seek change?",
            why_it_matters="Hard Fact customers have accepted the status quo. They won't move without a trigger. Find the trigger, find the customer.",
            criticality=Criticality.KILLER,
            founder_trap="Expecting customers to proactively look for you. They won't. You need to find them at trigger moments.",
            probing_questions=[
                "What bad thing has to happen before they'll consider changing?",
                "What milestone or event makes them reconsider their approach?",
                "How do you identify companies that just had this trigger?",
                "Can you reach people before or right after the trigger?"
            ]
        ),
        "hf:current_workaround": FrameworkQuestion(
            id="hf:current_workaround",
            question="What workaround do they currently use? How bad is it really?",
            why_it_matters="Understanding the workaround reveals what they actually value and what friction they've accepted.",
            criticality=Criticality.KILLER,
            founder_trap="Assuming their workaround is unbearable. If they've lived with it for years, it's 'good enough' to them.",
            probing_questions=[
                "Walk me through their current process step by step.",
                "How many hours per week does the workaround take?",
                "What's the error rate or cost of the workaround?",
                "Why haven't they fixed this themselves?"
            ]
        ),
        "hf:education_strategy": FrameworkQuestion(
            id="hf:education_strategy",
            question="How do you educate them that a better way exists?",
            why_it_matters="Hard Fact customers don't know they need you. Your first job is education, not selling.",
            criticality=Criticality.HIGH,
            founder_trap="Leading with product features. First they need to believe the problem is worth solving.",
            probing_questions=[
                "What content are you creating to name the problem?",
                "How do you show them the cost of their current approach?",
                "Who are the thought leaders you can partner with?",
                "What 'aha moment' makes them realize there's a better way?"
            ]
        ),
        "hf:behavior_shift": FrameworkQuestion(
            id="hf:behavior_shift",
            question="How long does it take to shift their behavior? What's realistic?",
            why_it_matters="Behavior change is slow. Unrealistic timelines lead to burnout and pivots before the market moves.",
            criticality=Criticality.HIGH,
            founder_trap="Expecting fast sales cycles. Education takes time. Plan for longer cycles.",
            probing_questions=[
                "What's your average time from first touch to purchase?",
                "How many touchpoints does a typical customer need?",
                "What objections do you hear repeatedly?",
                "How do you nurture leads over time?"
            ]
        ),
    },
    "future_vision": {
        "fv:stepping_stone": FrameworkQuestion(
            id="fv:stepping_stone",
            question="What's your 'stepping stone' product that makes money while you build the vision?",
            why_it_matters="Future Vision companies run out of money waiting for the market. You need revenue NOW while you build toward the vision.",
            criticality=Criticality.KILLER,
            founder_trap="Burning runway waiting for the market to catch up. You'll die before your vision happens.",
            probing_questions=[
                "What can you sell today that generates real revenue?",
                "How does the stepping stone connect to your ultimate vision?",
                "What percentage of your time goes to stepping stone vs. vision?",
                "Can the stepping stone become a moat?"
            ]
        ),
        "fv:true_believers": FrameworkQuestion(
            id="fv:true_believers",
            question="Who are your true believers? The people who 'get it' when others don't?",
            why_it_matters="Future Vision customers are rare. You need to find and nurture the early believers who will champion you.",
            criticality=Criticality.KILLER,
            founder_trap="Trying to convince skeptics. Focus on believers and let them convert others.",
            probing_questions=[
                "Can you name 10 people who truly believe in your vision?",
                "Why do they believe when others are skeptical?",
                "How can you find more people like them?",
                "What would make them evangelize for you?"
            ]
        ),
        "fv:runway_timeline": FrameworkQuestion(
            id="fv:runway_timeline",
            question="How long is your runway? How long until the market catches up?",
            why_it_matters="Future Vision is a survival game. You need to outlast the market's disbelief.",
            criticality=Criticality.KILLER,
            founder_trap="Optimistic market timing. The market always takes longer than you think.",
            probing_questions=[
                "How many months of runway do you have?",
                "What milestones would unlock more funding?",
                "What's your plan if the market takes 5 years to catch up?",
                "What can you cut to extend runway?"
            ]
        ),
        "fv:belief_shift": FrameworkQuestion(
            id="fv:belief_shift",
            question="What needs to happen for people to believe this is possible?",
            why_it_matters="Your job is to survive until belief shifts. Knowing the triggers helps you time your push.",
            criticality=Criticality.HIGH,
            founder_trap="Pushing against disbelief instead of waiting for belief triggers. Time your evangelism.",
            probing_questions=[
                "What technology/cultural shift would change minds?",
                "What proof points would make skeptics reconsider?",
                "Who needs to validate this for the mainstream to believe?",
                "What early wins would demonstrate possibility?"
            ]
        ),
    },
}


# =============================================================================
# GAP ANALYSIS FUNCTIONS
# =============================================================================

def get_nodes_connected_to(graph_state: Dict[str, Any], framework_id: str) -> List[Dict[str, Any]]:
    """Get all user nodes connected to a framework node"""
    
    connected_node_ids = set()
    
    for edge in graph_state.get("edges", []):
        # Handle both 'from'/'to' and 'source_id'/'target_id' formats
        source = edge.get("from") or edge.get("source_id", "")
        target = edge.get("to") or edge.get("target_id", "")
        
        if target == framework_id:
            connected_node_ids.add(source)
        elif source == framework_id:
            connected_node_ids.add(target)
    
    # Return non-framework nodes that are connected
    return [
        node for node in graph_state.get("nodes", [])
        if node["id"] in connected_node_ids and node.get("type") != "framework"
    ]


def calculate_coverage(connected_nodes: List[Dict[str, Any]]) -> float:
    """
    Calculate how well a framework question is addressed.
    
    Scoring:
    - Evidence nodes count more than claims
    - High confidence counts more
    - Multiple nodes is better than one
    """
    
    if not connected_nodes:
        return 0.0
    
    total_score = 0.0
    
    for node in connected_nodes:
        # Base score by type
        type_scores = {
            "evidence": 0.4,   # Evidence is gold
            "fact": 0.3,       # Facts are solid
            "claim": 0.15      # Claims need validation
        }
        base = type_scores.get(node.get("type", "claim"), 0.1)
        
        # Confidence multiplier (0.5x to 1.5x)
        confidence = node.get("confidence", 50)
        conf_multiplier = 0.5 + (confidence / 100)
        
        total_score += base * conf_multiplier
    
    # Cap at 1.0
    return min(1.0, total_score)


def analyze_gaps(
    graph_state: Dict[str, Any],
    threshold: float = 0.5,
    categories: Optional[List[str]] = None,
    pmf_path: Optional[str] = None
) -> List[Gap]:
    """
    Analyze the graph and return unanswered/underaddressed questions.
    
    Args:
        graph_state: The current graph state with nodes and edges
        threshold: Coverage score below which a question is considered a gap (default 0.5)
        categories: Optional list of categories to filter by (e.g., ['problem', 'market'])
        pmf_path: Optional PMF path ('hair_on_fire', 'hard_fact', 'future_vision') to include path-specific questions
    
    Returns:
        List of Gap objects, sorted by criticality and coverage
    """
    
    gaps = []
    
    # Combine base questions with path-specific questions if path is known
    questions_to_check = dict(FRAMEWORK_QUESTIONS)
    if pmf_path and pmf_path in PATH_SPECIFIC_QUESTIONS:
        questions_to_check.update(PATH_SPECIFIC_QUESTIONS[pmf_path])
    
    for framework_id, question_data in questions_to_check.items():
        # Filter by category if specified (only for base framework questions)
        if categories and framework_id.startswith("framework:"):
            # Extract category from framework_id (e.g., 'problem' from 'framework:problem:pain')
            parts = framework_id.split(":")
            if len(parts) >= 2 and parts[1] not in categories:
                continue
        
        # Find all nodes connected to this framework question
        connected_nodes = get_nodes_connected_to(graph_state, framework_id)
        
        # Calculate coverage score
        coverage = calculate_coverage(connected_nodes)
        
        # If under threshold, it's a gap
        if coverage < threshold:
            gaps.append(Gap(
                framework_id=framework_id,
                question=question_data.question,
                why_it_matters=question_data.why_it_matters,
                criticality=question_data.criticality.value,
                founder_trap=question_data.founder_trap,
                probing_questions=question_data.probing_questions,
                coverage_score=coverage,
                connected_nodes=connected_nodes
            ))
    
    # Sort: killers first, then high, then by coverage (lowest first)
    # For path-specific questions (non-framework), give them priority
    criticality_order = {
        "killer": 0,
        "high": 1,
        "medium": 2,
        "low": 3
    }
    
    def sort_key(g: Gap):
        # Path-specific questions get a slight boost in sorting
        is_path_specific = not g.framework_id.startswith("framework:")
        path_boost = -0.1 if is_path_specific else 0
        return (
            criticality_order.get(g.criticality, 4) + path_boost,
            g.coverage_score
        )
    
    gaps.sort(key=sort_key)
    
    return gaps


def get_path_specific_gaps(
    graph_state: Dict[str, Any],
    pmf_path: str,
    threshold: float = 0.5
) -> List[Gap]:
    """
    Get only the path-specific gaps for a given PMF path.
    
    Args:
        graph_state: The current graph state with nodes and edges
        pmf_path: The PMF path ('hair_on_fire', 'hard_fact', 'future_vision')
        threshold: Coverage score below which a question is considered a gap
    
    Returns:
        List of Gap objects for path-specific questions only
    """
    
    if pmf_path not in PATH_SPECIFIC_QUESTIONS:
        return []
    
    gaps = []
    
    for question_id, question_data in PATH_SPECIFIC_QUESTIONS[pmf_path].items():
        connected_nodes = get_nodes_connected_to(graph_state, question_id)
        coverage = calculate_coverage(connected_nodes)
        
        if coverage < threshold:
            gaps.append(Gap(
                framework_id=question_id,
                question=question_data.question,
                why_it_matters=question_data.why_it_matters,
                criticality=question_data.criticality.value,
                founder_trap=question_data.founder_trap,
                probing_questions=question_data.probing_questions,
                coverage_score=coverage,
                connected_nodes=connected_nodes
            ))
    
    # Sort by criticality
    criticality_order = {"killer": 0, "high": 1, "medium": 2, "low": 3}
    gaps.sort(key=lambda g: (criticality_order.get(g.criticality, 4), g.coverage_score))
    
    return gaps


def get_gap_summary(gaps: List[Gap]) -> Dict[str, Any]:
    """
    Generate a summary of the gap analysis.
    
    Returns:
        Dictionary with gap statistics and prioritized actions
    """
    
    if not gaps:
        return {
            "total_gaps": 0,
            "killer_gaps": 0,
            "high_gaps": 0,
            "medium_gaps": 0,
            "low_gaps": 0,
            "most_critical": None,
            "priority_actions": [],
            "overall_readiness": "complete"
        }
    
    killer_gaps = [g for g in gaps if g.criticality == "killer"]
    high_gaps = [g for g in gaps if g.criticality == "high"]
    medium_gaps = [g for g in gaps if g.criticality == "medium"]
    low_gaps = [g for g in gaps if g.criticality == "low"]
    
    # Calculate overall readiness
    total_questions = len(FRAMEWORK_QUESTIONS)
    gaps_count = len(gaps)
    answered_percentage = ((total_questions - gaps_count) / total_questions) * 100
    
    if len(killer_gaps) > 0:
        overall_readiness = "critical_gaps"
    elif len(high_gaps) > 2:
        overall_readiness = "needs_work"
    elif answered_percentage >= 80:
        overall_readiness = "good"
    else:
        overall_readiness = "in_progress"
    
    # Get priority actions (top 3 gaps with their first probing question)
    priority_actions = []
    for gap in gaps[:3]:
        priority_actions.append({
            "framework_id": gap.framework_id,
            "action": gap.probing_questions[0] if gap.probing_questions else gap.question,
            "criticality": gap.criticality,
            "why": gap.why_it_matters[:100] + "..." if len(gap.why_it_matters) > 100 else gap.why_it_matters
        })
    
    return {
        "total_gaps": len(gaps),
        "killer_gaps": len(killer_gaps),
        "high_gaps": len(high_gaps),
        "medium_gaps": len(medium_gaps),
        "low_gaps": len(low_gaps),
        "most_critical": gaps[0].to_dict() if gaps else None,
        "priority_actions": priority_actions,
        "overall_readiness": overall_readiness,
        "completion_percentage": round(answered_percentage, 1)
    }


def get_category_gaps(graph_state: Dict[str, Any], category: str) -> Dict[str, Any]:
    """
    Get gaps for a specific category.
    
    Args:
        graph_state: The current graph state
        category: Category to filter by (e.g., 'problem', 'market', 'solution')
    
    Returns:
        Dictionary with category-specific gap analysis
    """
    
    gaps = analyze_gaps(graph_state, categories=[category])
    
    # Get all framework questions for this category
    category_questions = [
        fid for fid in FRAMEWORK_QUESTIONS.keys()
        if fid.split(":")[1] == category
    ]
    
    return {
        "category": category,
        "total_questions": len(category_questions),
        "gaps_count": len(gaps),
        "completion_percentage": round(
            ((len(category_questions) - len(gaps)) / len(category_questions)) * 100, 1
        ) if category_questions else 100,
        "gaps": [g.to_dict() for g in gaps]
    }
