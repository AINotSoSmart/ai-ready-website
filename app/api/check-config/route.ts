import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasFirecrawlKey: !!process.env.FIRECRAWL_API_KEY,
  });
}