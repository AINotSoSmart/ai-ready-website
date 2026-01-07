/**
 * OpenRouter Client - Multi-LLM Access with Web Search
 * Using :online suffix for real-time web data
 */

export const LLM_MODELS = {
    chatgpt: {
        id: 'openai/gpt-4o-mini:online',
        label: 'ChatGPT',
        icon: '🤖',
        color: '#10a37f'
    },
    claude: {
        id: 'anthropic/claude-3.5-sonnet:online',
        label: 'Claude',
        icon: '🧠',
        color: '#cc785c'
    },
    gemini: {
        id: 'google/gemini-2.0-flash:online',
        label: 'Gemini',
        icon: '✨',
        color: '#4285f4'
    },
    grok: {
        id: 'x-ai/grok-4.1-fast:online',
        label: 'Grok',
        icon: '🚀',
        color: '#000000'
    },
    perplexity: {
        id: 'perplexity/sonar',
        label: 'Perplexity',
        icon: '🌪️',
        color: '#ff7000'
    }
} as const;

export type LLMProvider = keyof typeof LLM_MODELS;

interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenRouterResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Query a single LLM via OpenRouter
 */
export async function queryLLM(
    modelKey: LLMProvider,
    messages: OpenRouterMessage[],
    options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content: string; error?: string }> {
    const model = LLM_MODELS[modelKey];

    if (!process.env.OPENROUTER_API_KEY) {
        return { success: false, content: '', error: 'OpenRouter API key not configured' };
    }

    try {
        console.log(`[OPENROUTER] Querying ${model.label}...`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'FlipAEO LLM Visibility Checker'
            },
            body: JSON.stringify({
                model: model.id,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OPENROUTER] Error for ${model.label}:`, errorText);
            return { success: false, content: '', error: `API error: ${response.status}` };
        }

        const data: OpenRouterResponse = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
            console.log(`[OPENROUTER] ${model.label} responded successfully`);
            return { success: true, content: data.choices[0].message.content };
        }

        return { success: false, content: '', error: 'No content in response' };
    } catch (error) {
        console.error(`[OPENROUTER] Request failed for ${model.label}:`, error);
        return {
            success: false,
            content: '',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Query all LLMs in parallel with the same prompt
 */
export async function queryAllLLMs(
    query: string
): Promise<Record<LLMProvider, { success: boolean; content: string; error?: string }>> {
    const messages: OpenRouterMessage[] = [
        { role: 'user', content: query }
    ];

    const providers = Object.keys(LLM_MODELS) as LLMProvider[];

    const results = await Promise.all(
        providers.map(async (provider) => {
            const result = await queryLLM(provider, messages);
            return { provider, result };
        })
    );

    return results.reduce((acc, { provider, result }) => {
        acc[provider] = result;
        return acc;
    }, {} as Record<LLMProvider, { success: boolean; content: string; error?: string }>);
}
