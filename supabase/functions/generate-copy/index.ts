import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context, messages } = await req.json();

    console.log('Generating copy with context');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Build system prompt
    const systemPrompt = `You are CopySensei, an expert copywriting assistant. You help users create compelling marketing copy and provide strategic marketing advice.

${context.toneOfVoice ? `Tone of Voice: ${context.toneOfVoice}` : ''}
${context.researchData ? `\n\nBusiness Context:\n${context.researchData.substring(0, 2000)}` : ''}
${context.customNotes ? `\n\nCustom Notes:\n${context.customNotes}` : ''}

Your capabilities:
1. Generate marketing copy (when explicitly requested)
2. Answer questions about copywriting best practices
3. Provide feedback on existing copy
4. Help with marketing strategy

Be helpful, professional, and concise. When generating copy, make it compelling and aligned with the tone of voice.`;

    // Prepare messages for OpenAI
    let openaiMessages;
    
    if (messages && Array.isArray(messages)) {
      // If conversation history is provided, use it
      openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    } else {
      // Single prompt mode (for backward compatibility)
      openaiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedCopy = data.choices[0].message.content;

    console.log('Copy generation completed successfully');

    return new Response(JSON.stringify({ generatedCopy }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-copy function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
