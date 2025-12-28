/**
 * Probe Generator - Uses Gemini 2.5 Pro to generate user-intent queries
 */
import { GoogleGenAI } from '@google/genai';
import { BrandDNA, Competitor } from './tavily';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

export interface ProbeQuery {
    query: string;
    type: 'comparison' | 'best-of' | 'problem' | 'recommendation' | 'review' | 'how-to';
    intent: string;
}

/**
 * Extract Brand DNA from scraped content using Gemini
 */
export async function extractBrandDNA(
    url: string,
    scrapedContent: string
): Promise<BrandDNA> {
    const domain = new URL(url).hostname.replace('www.', '');

    const prompt = `Analyze this website content and extract brand information.

URL: ${url}
Content:
${scrapedContent.substring(0, 8000)}

Return a JSON object with EXACTLY this structure (no markdown, pure JSON):
{
  "name": "Brand Name",
  "tagline": "Their main tagline or value proposition",
  "product": "What they sell/offer in 1-2 sentences",
  "usp": "Their unique selling proposition - what makes them different",
  "audience": "Target audience/customers",
  "features": ["feature1", "feature2", "feature3", "feature4", "feature5"],
  "category": "Industry category (e.g., 'payment processing', 'project management', 'email marketing')",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.3 }
        });

        const content = response.text || '';
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(jsonStr);

        return {
            ...parsed,
            domain,
            rawContent: scrapedContent.substring(0, 2000)
        };
    } catch (error) {
        console.error('[GEMINI] Brand DNA extraction error:', error);

        // Fallback
        const brandName = domain.split('.')[0];
        return {
            name: brandName.charAt(0).toUpperCase() + brandName.slice(1),
            domain,
            tagline: '',
            product: 'Unknown product',
            usp: '',
            audience: 'General audience',
            features: [],
            category: 'technology',
            keywords: [brandName],
            rawContent: scrapedContent.substring(0, 2000)
        };
    }
}

/**
 * Generate probe queries using Gemini 2.5 Pro (Thinking model)
 */
export async function generateProbeQueries(
    brandDNA: BrandDNA,
    competitors: Competitor[]
): Promise<ProbeQuery[]> {
    const competitorNames = competitors.map(c => c.name).join(', ');

    const prompt = `You are simulating real humans asking questions to AI chatbots like ChatGPT, Claude, etc.

CONTEXT - The brand we're testing visibility for:
- Brand: ${brandDNA.name}
- What they do: ${brandDNA.product}
- Category: ${brandDNA.category}
- Target users: ${brandDNA.audience}

COMPETITORS: ${competitorNames || 'various companies in this space'}

TASK: Generate exactly 10 questions that REAL humans would type into ChatGPT when looking for solutions in this space.

CRITICAL RULES:
1. Write like a REAL person, not a marketing robot
2. Use casual language - "I need...", "what's the best...", "any good..."
3. Include typos occasionally (like real users)
4. Various perspectives: freelancer, startup founder, enterprise, student, small business owner
5. Mix of specific problems and general exploration
6. DO NOT use formal terms like "platform", "solution", "software" too much - people say "tool", "app", "thing"
7. DO NOT include the brand name "${brandDNA.name}" in queries - we're testing if LLMs mention it naturally

EXAMPLE GOOD QUERIES (for a project management tool):
- "whats the best app for managing team tasks?"
- "i run a small agency, need something to track client projects"
- "asana vs monday vs notion which is actually worth paying for"
- "free tools for managing my startup's workflow?"
- "how do other freelancers organize their projects?"

EXAMPLE BAD QUERIES (too robotic):
- "best project management platform solutions"  ❌
- "how to choose project management software" ❌
- "project management platform for small business" ❌

Return a JSON array with 10 queries (no markdown, just raw JSON):
[
  {"query": "natural human question here?", "type": "best-of|comparison|problem|recommendation|how-to", "intent": "brief intent"},
  ...
]`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7,
                thinkingConfig: { thinkingBudget: 1024 }
            }
        });

        const content = response.text || '';
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const queries = JSON.parse(jsonStr);
        console.log('[GEMINI] Generated', queries.length, 'probe queries');

        return queries;
    } catch (error) {
        console.error('[GEMINI] Probe generation error:', error);

        // Fallback queries - more human-like
        return [
            { query: `whats the best ${brandDNA.category} tool out there?`, type: 'best-of', intent: 'Discover top solutions' },
            { query: `need something for ${brandDNA.category}, any recs?`, type: 'recommendation', intent: 'Get recommendations' },
            { query: `how do people usually handle ${brandDNA.category}?`, type: 'how-to', intent: 'Learn common approaches' },
            { query: `good free ${brandDNA.category} tools for startups?`, type: 'best-of', intent: 'Find affordable options' },
            { query: `im struggling with ${brandDNA.category}, what should i use?`, type: 'problem', intent: 'Solve a problem' },
            { query: `which ${brandDNA.category} app is worth paying for?`, type: 'comparison', intent: 'Compare paid options' },
            { query: `${brandDNA.category} tools for small teams?`, type: 'recommendation', intent: 'Find team solutions' },
            { query: `anyone have experience with ${brandDNA.category} tools?`, type: 'recommendation', intent: 'Get real feedback' },
            { query: `what do freelancers use for ${brandDNA.category}?`, type: 'how-to', intent: 'Learn from freelancers' },
            { query: `best way to get started with ${brandDNA.category}?`, type: 'how-to', intent: 'Start using solutions' }
        ];
    }
}
