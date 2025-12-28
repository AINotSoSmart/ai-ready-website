/**
 * Visibility Analyzer - Analyze LLM responses for brand visibility
 */
import { LLM_MODELS, LLMProvider } from './openrouter';
import { BrandDNA, Competitor } from './tavily';
import { ProbeQuery } from './probe-generator';

export interface QueryResult {
    query: ProbeQuery;
    llmResults: Record<LLMProvider, LLMQueryResult>;
}

export interface LLMQueryResult {
    provider: LLMProvider;
    label: string;
    icon: string;
    color: string;
    success: boolean;
    response: string;
    isMentioned: boolean;
    mentionCount: number;
    position: number; // 0 = not mentioned, 1 = first, 2 = second, etc.
    isCited: boolean;
    sentiment: 'positive' | 'neutral' | 'negative';
    competitorsMentioned: string[];
    error?: string;
}

export interface VisibilityReport {
    brand: BrandDNA;
    competitors: Competitor[];
    queries: ProbeQuery[];

    // Overall metrics
    overallScore: number;
    shareOfVoice: number;

    positionBreakdown: {
        first: number;
        top3: number;
        mentioned: number;
        notMentioned: number;
    };

    // Per-LLM breakdown
    llmScores: Record<LLMProvider, {
        score: number;
        mentionRate: number;
        avgPosition: number;
        sentiment: 'positive' | 'neutral' | 'negative';
    }>;

    // Competitor comparison
    competitorScores: Record<string, number>;

    // Query opportunities (where competitors appear but brand doesn't)
    opportunities: {
        query: string;
        competitorsMentioned: string[];
        llms: string[];
        impact: 'high' | 'medium' | 'low';
    }[];

    // Recommendations
    recommendations: {
        priority: 'high' | 'medium' | 'low';
        action: string;
        reason: string;
        impact: string;
    }[];

    // Raw results
    queryResults: QueryResult[];
}

/**
 * Analyze a single LLM response for brand visibility
 */
export function analyzeLLMResponse(
    response: string,
    brandDNA: BrandDNA,
    competitors: Competitor[],
    providerKey: LLMProvider,
    error?: string
): LLMQueryResult {
    const model = LLM_MODELS[providerKey];

    if (error || !response) {
        return {
            provider: providerKey,
            label: model.label,
            icon: model.icon,
            color: model.color,
            success: false,
            response: '',
            isMentioned: false,
            mentionCount: 0,
            position: 0,
            isCited: false,
            sentiment: 'neutral',
            competitorsMentioned: [],
            error
        };
    }

    const responseLower = response.toLowerCase();
    const brandName = brandDNA.name.toLowerCase();
    const domain = brandDNA.domain.toLowerCase();

    // Check for brand mentions
    const brandRegex = new RegExp(brandDNA.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const mentions = response.match(brandRegex) || [];
    const mentionCount = mentions.length;
    const isMentioned = mentionCount > 0;

    // Calculate position (1st, 2nd, 3rd mentioned)
    let position = 0;
    if (isMentioned) {
        const brandIndex = responseLower.indexOf(brandName);
        // Find all competitor mentions and their positions
        const allMentions: { name: string; index: number }[] = [];

        allMentions.push({ name: brandDNA.name, index: brandIndex });

        for (const comp of competitors) {
            const compIndex = responseLower.indexOf(comp.name.toLowerCase());
            if (compIndex !== -1) {
                allMentions.push({ name: comp.name, index: compIndex });
            }
        }

        allMentions.sort((a, b) => a.index - b.index);
        position = allMentions.findIndex(m => m.name === brandDNA.name) + 1;
    }

    // Check for domain citation
    const isCited = responseLower.includes(domain);

    // Analyze sentiment
    const sentiment = analyzeSentiment(response, brandDNA.name);

    // Find competitors mentioned
    const competitorsMentioned: string[] = [];
    for (const comp of competitors) {
        if (responseLower.includes(comp.name.toLowerCase())) {
            competitorsMentioned.push(comp.name);
        }
    }

    return {
        provider: providerKey,
        label: model.label,
        icon: model.icon,
        color: model.color,
        success: true,
        response,
        isMentioned,
        mentionCount,
        position,
        isCited,
        sentiment,
        competitorsMentioned
    };
}

function analyzeSentiment(text: string, brandName: string): 'positive' | 'neutral' | 'negative' {
    const textLower = text.toLowerCase();
    const brandLower = brandName.toLowerCase();

    // Find sentences containing the brand
    const sentences = text.split(/[.!?]+/);
    const brandSentences = sentences.filter(s =>
        s.toLowerCase().includes(brandLower)
    );

    if (brandSentences.length === 0) return 'neutral';

    const positiveWords = [
        'best', 'top', 'leading', 'excellent', 'great', 'recommended',
        'popular', 'trusted', 'reliable', 'innovative', 'powerful',
        'highly rated', 'favorite', 'outstanding', 'premium', 'quality',
        'industry leader', 'widely used', 'well-known'
    ];

    const negativeWords = [
        'avoid', 'bad', 'poor', 'worst', 'issue', 'problem', 'expensive',
        'difficult', 'complicated', 'limited', 'lacking', 'disappointing',
        'outdated', 'overpriced', 'buggy'
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const sentence of brandSentences) {
        const sentenceLower = sentence.toLowerCase();
        for (const word of positiveWords) {
            if (sentenceLower.includes(word)) positiveScore++;
        }
        for (const word of negativeWords) {
            if (sentenceLower.includes(word)) negativeScore++;
        }
    }

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
}

/**
 * Generate actionable recommendations based on visibility analysis
 */
export function generateRecommendations(
    report: Partial<VisibilityReport>
): VisibilityReport['recommendations'] {
    const recommendations: VisibilityReport['recommendations'] = [];

    // Check overall visibility
    if ((report.overallScore || 0) < 30) {
        recommendations.push({
            priority: 'high',
            action: 'Create comprehensive comparison pages with your competitors',
            reason: 'Your brand has very low AI visibility',
            impact: '+25-40% visibility improvement'
        });
    }

    // Check position breakdown
    if ((report.positionBreakdown?.first || 0) === 0) {
        recommendations.push({
            priority: 'high',
            action: 'Optimize your homepage and landing pages for key category queries',
            reason: 'You are never mentioned first in AI responses',
            impact: '+15-25% first-position mentions'
        });
    }

    // Check for citation gaps
    const avgCitationRate = Object.values(report.llmScores || {})
        .filter(s => s.mentionRate > 0)
        .length;

    if (avgCitationRate < 3) {
        recommendations.push({
            priority: 'medium',
            action: 'Get featured on review sites and industry publications that LLMs cite',
            reason: 'LLMs rarely cite your domain as a source',
            impact: '+10-20% citation rate'
        });
    }

    // Check opportunities
    if ((report.opportunities?.length || 0) > 3) {
        recommendations.push({
            priority: 'high',
            action: 'Create content targeting queries where competitors are mentioned but you are not',
            reason: `Found ${report.opportunities?.length} query opportunities`,
            impact: '+20-35% query coverage'
        });
    }

    // Always add content improvement suggestion
    recommendations.push({
        priority: 'medium',
        action: 'Add structured data (JSON-LD) to your key pages',
        reason: 'Helps AI understand your product and features',
        impact: '+5-15% discoverability'
    });

    return recommendations;
}
