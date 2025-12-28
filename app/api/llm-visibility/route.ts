import { NextRequest, NextResponse } from 'next/server';
import { scrapeBrandPage, searchCompetitors, BrandDNA, Competitor } from '@/lib/tavily';
import { extractBrandDNA, generateProbeQueries, ProbeQuery } from '@/lib/probe-generator';
import { queryAllLLMs, LLM_MODELS, LLMProvider } from '@/lib/openrouter';
import {
    analyzeLLMResponse,
    generateRecommendations,
    VisibilityReport,
    QueryResult,
    LLMQueryResult
} from '@/lib/visibility-analyzer';

interface VisibilityRequest {
    url: string;
}

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json() as VisibilityRequest;

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
        }

        // Normalize URL
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        console.log('[LLM-VISIBILITY] ====== STARTING ANALYSIS ======');
        console.log('[LLM-VISIBILITY] URL:', normalizedUrl);

        // ========================================
        // PHASE 1: RECON - Brand DNA Extraction
        // ========================================
        console.log('[LLM-VISIBILITY] PHASE 1: Extracting Brand DNA...');

        const scrapeResult = await scrapeBrandPage(normalizedUrl);

        let brandDNA: BrandDNA;
        if (scrapeResult.success) {
            brandDNA = await extractBrandDNA(normalizedUrl, scrapeResult.content);
        } else {
            // Fallback to basic extraction from URL
            const domain = new URL(normalizedUrl).hostname.replace('www.', '');
            const brandName = domain.split('.')[0];
            brandDNA = {
                name: brandName.charAt(0).toUpperCase() + brandName.slice(1),
                domain,
                tagline: '',
                product: 'Unknown product',
                usp: '',
                audience: 'General audience',
                features: [],
                category: 'technology',
                keywords: [brandName],
                rawContent: ''
            };
        }

        console.log('[LLM-VISIBILITY] Brand:', brandDNA.name, '| Category:', brandDNA.category);

        // ========================================
        // PHASE 1b: RECON - Competitor Discovery
        // ========================================
        console.log('[LLM-VISIBILITY] PHASE 1b: Finding competitors...');

        const competitors = await searchCompetitors(brandDNA.name, brandDNA.product, brandDNA.category);

        // Filter out the brand itself from competitors
        const filteredCompetitors = competitors.filter(
            c => c.domain.toLowerCase() !== brandDNA.domain.toLowerCase() &&
                c.name.toLowerCase() !== brandDNA.name.toLowerCase()
        ).slice(0, 3);

        console.log('[LLM-VISIBILITY] Found competitors:', filteredCompetitors.map(c => c.name).join(', '));

        // ========================================
        // PHASE 2: PROBE GENERATION
        // ========================================
        console.log('[LLM-VISIBILITY] PHASE 2: Generating probe queries...');

        const probeQueries = await generateProbeQueries(brandDNA, filteredCompetitors);
        console.log('[LLM-VISIBILITY] Generated', probeQueries.length, 'queries');

        // ========================================
        // PHASE 3: LLM PROBING
        // ========================================
        console.log('[LLM-VISIBILITY] PHASE 3: Probing LLMs...');

        const queryResults: QueryResult[] = [];
        const providers = Object.keys(LLM_MODELS) as LLMProvider[];

        // Run all queries (10 for comprehensive coverage)
        const queriesToRun = probeQueries.slice(0, 10);

        for (const query of queriesToRun) {
            console.log('[LLM-VISIBILITY] Query:', query.query.substring(0, 50) + '...');

            const llmResponses = await queryAllLLMs(query.query);

            const llmResults: Record<LLMProvider, LLMQueryResult> = {} as Record<LLMProvider, LLMQueryResult>;

            for (const provider of providers) {
                const response = llmResponses[provider];
                llmResults[provider] = analyzeLLMResponse(
                    response.content,
                    brandDNA,
                    filteredCompetitors,
                    provider,
                    response.error
                );
            }

            queryResults.push({ query, llmResults });
        }

        // ========================================
        // CALCULATE METRICS
        // ========================================
        console.log('[LLM-VISIBILITY] Calculating metrics...');

        // Per-LLM scores
        const llmScores: VisibilityReport['llmScores'] = {} as VisibilityReport['llmScores'];

        for (const provider of providers) {
            const results = queryResults.map(qr => qr.llmResults[provider]);
            const successResults = results.filter(r => r.success);

            const mentionCount = successResults.filter(r => r.isMentioned).length;
            const mentionRate = successResults.length > 0 ? mentionCount / successResults.length : 0;

            const positions = successResults.filter(r => r.position > 0).map(r => r.position);
            const avgPosition = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;

            const sentiments = successResults.filter(r => r.isMentioned).map(r => r.sentiment);
            const posCount = sentiments.filter(s => s === 'positive').length;
            const negCount = sentiments.filter(s => s === 'negative').length;
            const overallSentiment = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

            llmScores[provider] = {
                score: Math.round(mentionRate * 100),
                mentionRate: Math.round(mentionRate * 100),
                avgPosition,
                sentiment: overallSentiment
            };
        }

        // Position breakdown
        let firstCount = 0, top3Count = 0, mentionedCount = 0, notMentionedCount = 0;

        for (const qr of queryResults) {
            for (const provider of providers) {
                const result = qr.llmResults[provider];
                if (result.success) {
                    if (result.position === 1) firstCount++;
                    if (result.position > 0 && result.position <= 3) top3Count++;
                    if (result.isMentioned) mentionedCount++;
                    else notMentionedCount++;
                }
            }
        }

        // Competitor scores
        const competitorScores: Record<string, number> = {};
        for (const comp of filteredCompetitors) {
            let compMentions = 0;
            let totalChecks = 0;

            for (const qr of queryResults) {
                for (const provider of providers) {
                    const result = qr.llmResults[provider];
                    if (result.success) {
                        totalChecks++;
                        if (result.competitorsMentioned.includes(comp.name)) {
                            compMentions++;
                        }
                    }
                }
            }

            competitorScores[comp.name] = totalChecks > 0 ? Math.round((compMentions / totalChecks) * 100) : 0;
        }

        // Find opportunities (queries where competitors mentioned but brand not)
        const opportunities: VisibilityReport['opportunities'] = [];

        for (const qr of queryResults) {
            const notMentionedLLMs: string[] = [];
            const competitorsMentionedSet = new Set<string>();

            for (const provider of providers) {
                const result = qr.llmResults[provider];
                if (result.success && !result.isMentioned) {
                    notMentionedLLMs.push(result.label);
                    result.competitorsMentioned.forEach(c => competitorsMentionedSet.add(c));
                }
            }

            if (notMentionedLLMs.length >= 2 && competitorsMentionedSet.size > 0) {
                opportunities.push({
                    query: qr.query.query,
                    competitorsMentioned: Array.from(competitorsMentionedSet),
                    llms: notMentionedLLMs,
                    impact: notMentionedLLMs.length >= 4 ? 'high' : notMentionedLLMs.length >= 2 ? 'medium' : 'low'
                });
            }
        }

        // Calculate overall score
        const totalMentions = mentionedCount;
        const totalChecks = mentionedCount + notMentionedCount;
        const shareOfVoice = totalChecks > 0 ? Math.round((totalMentions / totalChecks) * 100) : 0;

        // Weight score: mentions (50%), first position (30%), citations (20%)
        const overallScore = Math.round(
            shareOfVoice * 0.5 +
            (firstCount / Math.max(totalChecks, 1)) * 100 * 0.3 +
            (top3Count / Math.max(totalChecks, 1)) * 100 * 0.2
        );

        // Build report
        const report: VisibilityReport = {
            brand: brandDNA,
            competitors: filteredCompetitors,
            queries: probeQueries,
            overallScore,
            shareOfVoice,
            positionBreakdown: {
                first: firstCount,
                top3: top3Count,
                mentioned: mentionedCount,
                notMentioned: notMentionedCount
            },
            llmScores,
            competitorScores,
            opportunities,
            recommendations: [],
            queryResults
        };

        // Generate recommendations
        report.recommendations = generateRecommendations(report);

        console.log('[LLM-VISIBILITY] ====== ANALYSIS COMPLETE ======');
        console.log('[LLM-VISIBILITY] Overall Score:', overallScore, '| Share of Voice:', shareOfVoice + '%');

        return NextResponse.json({
            success: true,
            ...report
        });

    } catch (error) {
        console.error('[LLM-VISIBILITY] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed'
        }, { status: 500 });
    }
}
