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
    const { websiteUrl, projectName } = await req.json();

    console.log('Fetching research for:', { websiteUrl, projectName });

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const generateAnalysisPrompt = (company: string, websiteUrl?: string): string => {
      const searchInstruction = websiteUrl 
        ? `CRITICAL: You MUST first search for and analyze the website "${websiteUrl}" to understand what "${company}" actually does. Do NOT search for just the company name "${company}" alone as this may return incorrect companies with similar names.`
        : `CRITICAL: Search for the exact company name "${company}" in quotes to avoid similar company names.`;

      return `As an expert business analyst and market researcher with over 20 years of experience, I need you to first research the company "${company}" using web search to gather accurate, current information, then provide a comprehensive ICP analysis. Prioritize the link received if there's any.

${searchInstruction}

VERIFICATION STEP: Before proceeding with analysis, you MUST:
a. Search for the company using web search
b. Verify you have the correct company by checking:
   - The exact company name matches "${company}"
   ${websiteUrl ? `- The website URL matches or relates to "${websiteUrl}"` : ''}
   - The business description aligns with what you'd expect
c. If you find multiple companies with similar names, clearly identify which one you're analyzing
d. If the company doesn't exist or you can't find reliable information, state this clearly

STEP 1: Research the company thoroughly using web search to find:
- What the company actually does (products/services)
- Their current customers and market
- Business model and pricing
- Company size and industry position
- Recent news and developments
- Main competitors

STEP 2: Based on your research findings, provide a detailed JSON response with the following structure:

{
  "company_overview": "Detailed description of the company, what they do, their market position, and key characteristics based on your research",
  "icps": [
    {
      "name": "ICP segment name",
      "demographics": "Company size, industry, geography, revenue range",
      "decision_makers": "Who makes buying decisions and their roles",
      "pain_points": "Main challenges and problems they face",
      "where_to_find": "Where to reach these prospects (events, platforms, communities)",
      "budget_range": "Typical budget range for solutions like this",
      "sales_cycle": "Expected length of sales process",
      "buying_triggers": "What events trigger them to look for solutions"
    }
  ],
  "gtm_strategies": [
    {
      "segment": "Which ICP segment this applies to",
      "strategy": "Overall GTM approach name",
      "approach": "Detailed strategy description",
      "timeline": "Implementation timeline",
      "key_metrics": "Important metrics to track",
      "budget_allocation": "How to allocate budget across channels",
      "success_factors": "Critical elements for success"
    }
  ],
  "messaging_frameworks": [
    {
      "segment": "Which ICP segment this applies to",
      "primary_message": "Core value proposition message",
      "value_propositions": ["List of key value props"],
      "pain_point_messaging": {
        "efficiency": "How to message around efficiency pain points",
        "cost": "How to message around cost concerns",
        "growth": "How to message around growth challenges"
      },
      "proof_points": ["List of credibility indicators"],
      "objection_handling": {
        "price": "How to handle price objections",
        "timing": "How to handle timing objections",
        "competition": "How to handle competitive concerns"
      }
    }
  ],
  "channel_recommendations": [
    {
      "segment": "Which ICP segment this applies to",
      "primary_channels": [
        {
          "channel": "Channel name",
          "rationale": "Why this channel works for this segment",
          "budget_allocation": "Percentage of budget",
          "expected_cac": "Expected customer acquisition cost",
          "tactics": "Specific tactics to use in this channel"
        }
      ],
      "testing_channels": ["List of channels to test"]
    }
  ],
  "key_insights": "Strategic recommendations and key takeaways for successful customer acquisition based on your research"
}

Please provide 2-3 distinct ICP segments, comprehensive GTM strategies for each, detailed messaging frameworks, and channel recommendations. Make sure all information is specific, actionable, and based on realistic market analysis from your research findings.`;
    };

    const prompt = generateAnalysisPrompt(projectName, websiteUrl);

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
            content: 'You are a business research assistant. Provide detailed, accurate research about businesses and websites.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
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
    const researchData = data.choices[0].message.content;

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
