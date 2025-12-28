/**
 * Tavily Client for Brand DNA Extraction and Competitor Research
 */
import { tavily } from '@tavily/core';

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface BrandDNA {
    name: string;
    domain: string;
    tagline: string;
    product: string;
    usp: string;
    audience: string;
    features: string[];
    category: string;
    keywords: string[];
    rawContent: string;
}

export interface Competitor {
    name: string;
    domain: string;
    description: string;
    position: number;
    isLikelyProduct?: boolean;
}

/**
 * Scrape brand homepage to extract content for DNA analysis
 */
export async function scrapeBrandPage(url: string): Promise<{
    success: boolean;
    content: string;
    title?: string;
    error?: string;
}> {
    try {
        console.log('[TAVILY] Scraping brand page:', url);

        const response = await tavilyClient.extract([url]);

        if (response.results && response.results.length > 0) {
            const result = response.results[0];
            console.log('[TAVILY] Scraped content length:', result.rawContent?.length || 0);

            return {
                success: true,
                content: result.rawContent || '',
                title: result.url
            };
        }

        return {
            success: false,
            content: '',
            error: 'No content extracted'
        };
    } catch (error) {
        console.error('[TAVILY] Scrape error:', error);
        return {
            success: false,
            content: '',
            error: error instanceof Error ? error.message : 'Scrape failed'
        };
    }
}

/**
 * Search for competitors in the brand's industry - uses product-specific queries
 */
export async function searchCompetitors(
    brandName: string,
    product: string,
    category: string
): Promise<Competitor[]> {
    try {
        // Use multiple search strategies for better results
        const searches = [
            `${brandName} alternatives`, // Direct alternatives
            `${brandName} vs competitors`, // Competitor comparisons
            `best ${product} software platforms`, // Product-specific
        ];

        console.log('[TAVILY] Searching for competitors of:', brandName);

        const allResults: any[] = [];

        // Run first search (alternatives) - usually gets best results
        const response = await tavilyClient.search(searches[0], {
            searchDepth: 'advanced',
            maxResults: 15,
            includeAnswer: true
        });

        allResults.push(...(response.results || []));

        // Extract unique domains as competitors
        const competitors: Competitor[] = [];
        const seenDomains = new Set<string>();

        // Exclude the brand's own domain
        const brandDomainParts = brandName.toLowerCase().replace(/\s+/g, '');

        for (const result of allResults) {
            try {
                const domain = new URL(result.url).hostname.replace('www.', '');
                const domainBase = domain.split('.')[0].toLowerCase();

                // Skip if already seen
                if (seenDomains.has(domain)) continue;

                // Skip excluded domains (review sites, social media, etc.)
                if (isExcludedDomain(domain)) continue;

                // Skip if it's the brand itself
                if (domainBase.includes(brandDomainParts) || brandDomainParts.includes(domainBase)) continue;

                // Look for signals that this is a competitor product
                const content = (result.content || '').toLowerCase();
                const title = (result.title || '').toLowerCase();

                // Skip if it's just a blog post or listicle
                if (isBlogOrListicle(result.url, title)) continue;

                // Prefer results that look like actual product/SaaS companies
                const isLikelyProduct =
                    title.includes('pricing') ||
                    title.includes('platform') ||
                    title.includes('software') ||
                    title.includes('tool') ||
                    content.includes('sign up') ||
                    content.includes('free trial') ||
                    content.includes('pricing') ||
                    domain.endsWith('.io') ||
                    domain.endsWith('.ai') ||
                    domain.endsWith('.app');

                seenDomains.add(domain);

                const compName = extractBrandName(domain, result.title);

                competitors.push({
                    name: compName,
                    domain,
                    description: result.content?.substring(0, 200) || '',
                    position: competitors.length + 1,
                    isLikelyProduct
                });

                if (competitors.length >= 8) break;
            } catch {
                continue;
            }
        }

        // Sort by likelihood of being actual product, take top 3
        const sortedCompetitors = competitors
            .sort((a, b) => (b.isLikelyProduct ? 1 : 0) - (a.isLikelyProduct ? 1 : 0))
            .slice(0, 3)
            .map((c, i) => ({ ...c, position: i + 1 }));

        console.log('[TAVILY] Found competitors:', sortedCompetitors.map(c => c.name).join(', '));
        return sortedCompetitors;
    } catch (error) {
        console.error('[TAVILY] Competitor search error:', error);
        return [];
    }
}

/**
 * Check if URL/title indicates a blog or listicle rather than a product
 */
function isBlogOrListicle(url: string, title: string): boolean {
    const blogIndicators = [
        '/blog/', '/article/', '/news/', '/post/',
        'best ', 'top 10', 'top 5', 'vs ', ' vs',
        'review', 'comparison', 'guide', 'how to'
    ];

    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    return blogIndicators.some(indicator =>
        urlLower.includes(indicator) || titleLower.includes(indicator)
    );
}

/**
 * Check if domain should be excluded from competitor list
 */
function isExcludedDomain(domain: string): boolean {
    const excluded = [
        'wikipedia.org', 'reddit.com', 'quora.com', 'linkedin.com',
        'twitter.com', 'x.com', 'facebook.com', 'youtube.com',
        'medium.com', 'forbes.com', 'techcrunch.com', 'g2.com',
        'capterra.com', 'producthunt.com', 'github.com', 'stackoverflow.com'
    ];
    return excluded.some(ex => domain.includes(ex));
}

/**
 * Extract brand name from domain or title
 */
function extractBrandName(domain: string, title?: string): string {
    // Try to extract from title first
    if (title) {
        const cleanTitle = title.split('|')[0].split('-')[0].split(':')[0].trim();
        if (cleanTitle.length > 0 && cleanTitle.length < 30) {
            return cleanTitle;
        }
    }

    // Fallback to domain
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
}
