/**
 * Question Templates
 * Templates for generating follow-up questions by category
 */

import type { QuestionTemplate, QuestionCategory } from './types';

export const questionTemplates: Record<QuestionCategory, QuestionTemplate[]> = {
  identity: [
    {
      trigger: 'person_without_name',
      template: "What's the name of this person? (for tracking)",
      inputType: 'text',
      placeholder: 'e.g., Maria, John Smith',
      defaultPriority: 'medium',
      reason: 'Tracking names helps connect evidence across multiple conversations.',
    },
    {
      trigger: 'person_without_role',
      template: "What's {person}'s role or title?",
      inputType: 'text',
      placeholder: 'e.g., Restaurant owner, Head of operations',
      defaultPriority: 'medium',
      reason: 'Understanding their role helps assess if they\'re the right decision maker.',
    },
    {
      trigger: 'company_mentioned',
      template: "What company does {person} work for?",
      inputType: 'text',
      placeholder: 'e.g., Acme Corp, Maria\'s Bistro',
      defaultPriority: 'low',
      reason: 'Company context helps understand their constraints and needs.',
    },
    {
      trigger: 'relationship_unclear',
      template: "How do you know {person}? How did you connect?",
      inputType: 'text',
      placeholder: 'e.g., LinkedIn outreach, warm intro from Alex',
      defaultPriority: 'low',
      reason: 'Understanding the relationship helps assess information quality.',
    },
  ],

  context: [
    {
      trigger: 'business_without_size',
      template: "How big is {entity}? (employees, revenue, seats, etc.)",
      inputType: 'text',
      placeholder: 'e.g., 30 seats, $500K revenue, 5 employees',
      defaultPriority: 'medium',
      reason: 'Business size affects pain severity and willingness to pay.',
    },
    {
      trigger: 'business_without_type',
      template: "What type/segment is {entity}? (e.g., fast food, fine dining, SaaS)",
      inputType: 'text',
      placeholder: 'e.g., Fast casual, fine dining, B2B SaaS',
      defaultPriority: 'medium',
      reason: 'Different segments have different needs and economics.',
    },
    {
      trigger: 'location_missing',
      template: "Where is {entity} located?",
      inputType: 'text',
      placeholder: 'e.g., Brooklyn, NY; San Francisco Bay Area',
      defaultPriority: 'low',
      reason: 'Location affects market size and go-to-market strategy.',
    },
    {
      trigger: 'industry_unclear',
      template: "What industry or vertical is this in?",
      inputType: 'text',
      placeholder: 'e.g., Restaurants, Healthcare, Fintech',
      defaultPriority: 'medium',
      reason: 'Industry context shapes the entire business model.',
    },
  ],

  quantification: [
    {
      trigger: 'vague_amount',
      template: 'You mentioned "{vague_term}". Can you quantify that? (specific number or range)',
      inputType: 'text',
      placeholder: 'e.g., $2,500/month, 50%, 3 times per week',
      defaultPriority: 'high',
      reason: 'Specific numbers make your assumptions testable.',
    },
    {
      trigger: 'frequency_missing',
      template: "How often does {event} happen?",
      inputType: 'select',
      options: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Other'],
      defaultPriority: 'medium',
      reason: 'Frequency affects urgency and value of the solution.',
    },
    {
      trigger: 'cost_mentioned_no_breakdown',
      template: "Can you break down the ${amount} cost? What makes it up?",
      inputType: 'text',
      placeholder: 'e.g., Labor: $1,500, Spoilage: $800, Other: $200',
      defaultPriority: 'medium',
      reason: 'Understanding cost breakdown reveals where you can add most value.',
    },
    {
      trigger: 'percentage_could_help',
      template: "What percentage of {total} does this represent?",
      inputType: 'number',
      placeholder: '0-100',
      defaultPriority: 'medium',
      reason: 'Percentages help size the opportunity.',
    },
    {
      trigger: 'time_spent_unknown',
      template: "How much time does {person} spend on {task}?",
      inputType: 'text',
      placeholder: 'e.g., 2 hours/day, 10 hours/week',
      defaultPriority: 'medium',
      reason: 'Time spent indicates pain severity and value of automation.',
    },
  ],

  behavior: [
    {
      trigger: 'problem_without_current_solution',
      template: "How does {person} currently handle this problem?",
      inputType: 'text',
      placeholder: 'e.g., Manual spreadsheets, Hired someone, Just lives with it',
      defaultPriority: 'high',
      reason: 'Understanding current solutions reveals competitive landscape.',
    },
    {
      trigger: 'tried_alternatives',
      template: "What solutions has {person} tried before? What happened?",
      inputType: 'text',
      placeholder: 'e.g., Tried App X but too expensive, used App Y but too complex',
      defaultPriority: 'high',
      reason: 'Past attempts reveal what features matter and pricing expectations.',
    },
    {
      trigger: 'workflow_unclear',
      template: "Walk me through their current process for {task}.",
      inputType: 'text',
      placeholder: 'Describe the step-by-step process',
      defaultPriority: 'medium',
      reason: 'Detailed workflows reveal friction points and integration needs.',
    },
    {
      trigger: 'workaround_mentioned',
      template: "You mentioned they use {workaround}. How well does that work?",
      inputType: 'scale',
      scaleRange: [1, 10],
      scaleLabels: ['Terrible', 'Works great'],
      defaultPriority: 'medium',
      reason: 'Workaround satisfaction indicates urgency to switch.',
    },
  ],

  intent: [
    {
      trigger: 'no_willingness_to_pay',
      template: "Would {person} pay for a solution? If so, how much?",
      inputType: 'text',
      placeholder: 'e.g., Yes, up to $50/month; No, budget is frozen',
      defaultPriority: 'high',
      reason: 'Willingness to pay is the ultimate validation signal.',
    },
    {
      trigger: 'price_mentioned_no_commitment',
      template: "Did {person} say they would actually buy at ${price}, or just that it seems reasonable?",
      inputType: 'select',
      options: ['Would definitely buy', 'Probably would buy', 'Just said it seems fair', 'Not sure'],
      defaultPriority: 'high',
      reason: 'Distinguishing interest from commitment is critical.',
    },
    {
      trigger: 'switching_cost_unknown',
      template: "What would it take for {person} to switch from their current solution?",
      inputType: 'text',
      placeholder: 'e.g., Data migration support, 50% cheaper, better mobile app',
      defaultPriority: 'medium',
      reason: 'Switching costs determine go-to-market difficulty.',
    },
    {
      trigger: 'urgency_unclear',
      template: "How urgently does {person} need this solved?",
      inputType: 'scale',
      scaleRange: [1, 10],
      scaleLabels: ['Not urgent', 'Hair on fire'],
      defaultPriority: 'high',
      reason: 'Urgency drives sales cycle speed and pricing power.',
    },
    {
      trigger: 'referral_potential',
      template: "Would {person} recommend a solution to others like them?",
      inputType: 'select',
      options: ['Yes, enthusiastically', 'Probably', 'Maybe', 'Unlikely'],
      defaultPriority: 'low',
      reason: 'Referral potential indicates product-market fit.',
    },
    {
      trigger: 'decision_maker_check',
      template: "Is {person} the decision maker for purchasing this type of solution?",
      inputType: 'select',
      options: ['Yes, they decide', 'Partially (needs approval)', 'No, someone else decides', 'Not sure'],
      defaultPriority: 'medium',
      reason: 'Knowing the decision maker prevents wasted effort.',
    },
  ],

  source: [
    {
      trigger: 'person_source_unknown',
      template: "How did you find {person}? (for replicating outreach)",
      inputType: 'text',
      placeholder: 'e.g., LinkedIn, warm intro, cold email, conference',
      defaultPriority: 'low',
      reason: 'Successful channels should be repeated.',
    },
    {
      trigger: 'data_source_unclear',
      template: "Where did you get this information about {topic}?",
      inputType: 'text',
      placeholder: 'e.g., Industry report, competitor website, customer interview',
      defaultPriority: 'low',
      reason: 'Source reliability affects confidence in the data.',
    },
    {
      trigger: 'can_find_more',
      template: "Can you find more people like {person}? How?",
      inputType: 'text',
      placeholder: 'e.g., LinkedIn Sales Navigator, industry associations, referrals',
      defaultPriority: 'low',
      reason: 'Scalable customer acquisition is essential.',
    },
  ],

  confidence: [
    {
      trigger: 'single_data_point',
      template: "This is based on one person. How representative do you think {person} is?",
      inputType: 'select',
      options: ['Very representative', 'Somewhat representative', 'Might be an outlier', 'Probably an outlier'],
      defaultPriority: 'medium',
      reason: 'Single data points can be misleading.',
    },
    {
      trigger: 'assumption_stated',
      template: 'You said "{claim}". How confident are you in this?',
      inputType: 'scale',
      scaleRange: [1, 10],
      scaleLabels: ['Just a guess', 'Very confident'],
      defaultPriority: 'medium',
      reason: 'Calibrating confidence helps prioritize validation.',
    },
    {
      trigger: 'second_hand_info',
      template: "Did you hear this directly from {person}, or through someone else?",
      inputType: 'select',
      options: ['Directly from them', 'Through someone else', 'Read it somewhere', 'Other'],
      defaultPriority: 'low',
      reason: 'Direct information is more reliable.',
    },
    {
      trigger: 'sample_size_check',
      template: "How many people have you talked to about this?",
      inputType: 'number',
      placeholder: 'e.g., 5, 10, 20',
      defaultPriority: 'medium',
      reason: 'More data points increase confidence.',
    },
  ],

  contradiction: [
    {
      trigger: 'conflicts_with_existing',
      template: 'This conflicts with "{existing_claim}". Which do you think is more accurate?',
      inputType: 'select',
      options: ['The new information', 'The existing information', 'Both could be true (different contexts)', 'Not sure'],
      defaultPriority: 'high',
      reason: 'Contradictions must be resolved for a coherent understanding.',
    },
    {
      trigger: 'number_mismatch',
      template: "Previously you had {old_value}, now it's {new_value}. What changed?",
      inputType: 'text',
      placeholder: 'Explain the difference',
      defaultPriority: 'high',
      reason: 'Inconsistent data undermines decision-making.',
    },
  ],

  exploration: [
    {
      trigger: 'new_topic_mentioned',
      template: "You mentioned {topic} for the first time. Tell me more about this.",
      inputType: 'text',
      placeholder: 'Share any relevant details',
      defaultPriority: 'low',
      reason: 'New topics might reveal important insights.',
    },
    {
      trigger: 'interesting_detail',
      template: "That's interesting that {detail}. Can you elaborate?",
      inputType: 'text',
      placeholder: 'Provide more context',
      defaultPriority: 'low',
      reason: 'Interesting details often hide deeper insights.',
    },
    {
      trigger: 'framework_gap',
      template: 'You haven\'t addressed "{framework_question}" yet. Any thoughts?',
      inputType: 'text',
      placeholder: 'Share what you know or think',
      defaultPriority: 'medium',
      reason: 'Filling framework gaps ensures comprehensive evaluation.',
    },
    {
      trigger: 'emotional_signal',
      template: "{person} seemed {emotion} about this. Why do you think that is?",
      inputType: 'text',
      placeholder: 'e.g., They\'ve been burned before, It\'s costing them money',
      defaultPriority: 'medium',
      reason: 'Emotions reveal underlying motivations.',
    },
  ],
};

// Helper to get template by trigger
export function getTemplate(
  category: QuestionCategory,
  trigger: string
): QuestionTemplate | undefined {
  return questionTemplates[category].find(t => t.trigger === trigger);
}

// Helper to interpolate template variables
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
