import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl } = await req.json();

    console.log('Fetching research for URL:', websiteUrl);

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    if (!websiteUrl) {
      throw new Error('Website URL is required');
    }

    const generateAnalysisPrompt = (url: string): string => {
      return `You are an elite copywriting researcher combining expertise in: consumer psychology, market analysis, conversion optimization, and persuasive writing.

MISSION: Provide everything needed to write world-class, high-converting copy for ${url}

⚡ CRITICAL PROCESS ⚡

PHASE 1 - PAGE DEEP DIVE (visit ${url} first):
1. Read every word on the page
2. Screenshot the current messaging in your mind
3. Identify the offer, goal, and current approach
4. Note what's strong and what's weak

PHASE 2 - MARKET INTELLIGENCE:
5. Research 3-5 direct competitors
6. Find customer reviews, Reddit discussions, forum posts
7. Analyze industry trends and positioning gaps
8. Identify psychological triggers that work in this niche

PHASE 3 - SYNTHESIS:
9. Combine findings into actionable copywriting intelligence
10. Provide specific, evidence-based recommendations
11. Include actual examples and quotes

⚡ OUTPUT FORMAT ⚡
Respond with ONLY valid JSON (no markdown, no explanation):

{
  "page_snapshot": {
    "current_headline": "Exact headline from the page",
    "current_value_prop": "Their stated value proposition",
    "current_cta": "Their call-to-action text",
    "page_type": "Landing page / Product page / Homepage / etc.",
    "page_goal": "What action they want visitors to take",
    "what_works": ["Strength 1", "Strength 2"],
    "what_needs_improvement": ["Weakness 1", "Weakness 2"],
    "missing_elements": ["What's absent that should be there"]
  },
  
  "audience_intelligence": {
    "primary_avatar": {
      "who": "Specific description (not 'small business owners' but 'B2B SaaS founders with 10-50 employees')",
      "sophistication_level": "Unaware / Problem-aware / Solution-aware / Product-aware / Most aware",
      "buying_motivation": "Primary driver (fear / ambition / necessity / desire)",
      "decision_timeline": "How quickly do they typically decide?"
    },
    "pain_points": {
      "surface_level": ["What they say the problem is"],
      "deeper_pain": ["The real underlying frustration"],
      "cost_of_inaction": "What happens if they don't solve this?"
    },
    "desires_and_goals": {
      "functional_outcome": "The practical result they want",
      "emotional_outcome": "How they want to feel",
      "social_outcome": "How they want to be perceived",
      "transformation": "Their before → after state"
    },
    "objections_by_priority": [
      {
        "objection": "Most common hesitation",
        "severity": "Deal-breaker / Speed bump / Minor concern",
        "how_to_overcome": "Specific rebuttal strategy"
      }
    ]
  },

  "voice_of_customer": {
    "pain_language": ["Exact phrases customers use to describe problems"],
    "desire_language": ["How they describe what they want"],
    "transformation_language": ["Before/after phrases from reviews"],
    "objection_phrases": ["Common doubts in their own words"],
    "trigger_words": ["Words that get emotional reactions"],
    "sources": ["Where you found this language: reviews, forums, etc."]
  },

  "competitive_intelligence": {
    "competitors": [
      {
        "name": "Company name",
        "url": "Their URL",
        "positioning": "How they differentiate",
        "headline_approach": "Their actual headline",
        "strength": "What they do better",
        "weakness": "Their vulnerable point",
        "customer_complaints": "What their customers complain about"
      }
    ],
    "market_gap": "Unserved need or better positioning angle",
    "winning_differentiation": "How to position uniquely",
    "competitive_advantage": "This offer's strongest point vs competition"
  },

  "conversion_psychology": {
    "primary_trigger": "The main psychological lever (fear, greed, belonging, status, etc.)",
    "secondary_triggers": ["Supporting psychological motivators"],
    "trust_builders_needed": ["Specific proof elements required"],
    "risk_reversals": ["How to reduce perceived risk"],
    "scarcity_authenticity": "Real scarcity/urgency opportunities (not fake)",
    "social_proof_strategy": "What type of proof is most credible here"
  },

  "copywriting_blueprint": {
    "headline_strategy": {
      "approach": "Benefit / Curiosity / Problem / News / Question",
      "options": [
        {"headline": "Option 1", "why": "Rationale"},
        {"headline": "Option 2", "why": "Rationale"},
        {"headline": "Option 3", "why": "Rationale"}
      ]
    },
    "opening_hook": {
      "pattern": "Which proven pattern to use (PAS, AIDA, etc.)",
      "first_sentence": "Specific opening line suggestion",
      "hook_purpose": "Grab attention by doing X"
    },
    "value_prop_hierarchy": [
      "Most important benefit to lead with",
      "Second benefit",
      "Third benefit"
    ],
    "proof_stack": {
      "order": ["What proof to show in what sequence"],
      "types_needed": ["Testimonials, case studies, stats, etc."],
      "credibility_markers": ["Certifications, media mentions, etc."]
    },
    "cta_strategy": {
      "primary_cta": "Main call-to-action text",
      "cta_placement": "Where on page",
      "friction_reducers": ["What to add to make CTA less scary"],
      "alternatives": ["Backup CTA options if primary doesn't resonate"]
    },
    "objection_sequence": [
      {
        "objection": "Common hesitation",
        "placement": "Where in copy to address it",
        "rebuttal": "How to overcome it"
      }
    ]
  },

  "messaging_guidelines": {
    "tone": "Specific tone that works (professional, conversational, bold, empathetic)",
    "voice": "Active/passive, formal/casual, technical/simple",
    "reading_level": "Target grade level",
    "power_words": ["Words that resonate with this audience"],
    "words_to_avoid": ["Terms that turn them off"],
    "pacing": "Short punchy vs. longer explanatory",
    "storytelling_angle": "If story is appropriate, what type?"
  },

  "page_structure_recommendation": {
    "sections_in_order": [
      "Above fold: What to include",
      "Section 2: Purpose and content",
      "Section 3: Purpose and content"
    ],
    "length_guidance": "Short-form / Medium / Long-form and why",
    "visual_elements": "What images, videos, or graphics would help"
  },

  "evidence_and_sources": {
    "confidence_level": "High / Medium / Low - how certain are these insights?",
    "data_sources": ["Where information came from"],
    "assumptions": ["What's inferred vs. confirmed"],
    "gaps": ["What information is missing that would help"]
  }
}

🎯 QUALITY CHECKLIST:
- [ ] Every insight is specific to ${url}, not generic advice
- [ ] Included actual quotes and examples
- [ ] Cited competitor examples with URLs
- [ ] Found real customer language
- [ ] Provided evidence for major claims
- [ ] Made it immediately actionable

BE RUTHLESSLY SPECIFIC. Bad: "emphasize benefits" Good: "Lead with 'Cut onboarding time by 67%' because competitors focus on features while customers complain about implementation time"`;
    };

    const prompt = generateAnalysisPrompt(websiteUrl);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant. You MUST respond with ONLY valid JSON, no additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 6000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    let researchData = data.choices[0].message.content;

    // Try to extract just the JSON part if there's extra text
    try {
      // Remove markdown code blocks if present
      const jsonMatch = researchData.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        researchData = jsonMatch[1];
      }

      // Try to extract JSON object
      const objectMatch = researchData.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        researchData = objectMatch[0];
      }

      // Validate it's proper JSON
      JSON.parse(researchData);
    } catch (e) {
      console.error('Failed to parse JSON from response:', e);
      // Keep original if parsing fails
    }

    console.log('Research completed successfully');

    return new Response(JSON.stringify({ researchData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-research function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
