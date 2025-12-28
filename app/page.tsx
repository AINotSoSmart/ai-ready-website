"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import shared components
import { Connector } from "@/components/shared/layout/curvy-rect";
import HeroFlame from "@/components/shared/effects/flame/hero-flame";
import AsciiExplosion from "@/components/shared/effects/flame/ascii-explosion";
import { HeaderProvider } from "@/components/shared/header/HeaderContext";

// Import hero section components
import HomeHeroBackground from "@/components/app/(home)/sections/hero/Background/Background";
import { BackgroundOuterPiece } from "@/components/app/(home)/sections/hero/Background/BackgroundOuterPiece";
import HomeHeroPixi from "@/components/app/(home)/sections/hero/Pixi/Pixi";
import HeroInputSubmitButton from "@/components/app/(home)/sections/hero-input/Button/Button";
import Globe from "@/components/app/(home)/sections/hero-input/_svg/Globe";
import HeroScraping from "@/components/app/(home)/sections/hero-scraping/HeroScraping";
import { Endpoint } from "@/components/shared/Playground/Context/types";
import VisibilityPanel from "@/components/app/(home)/sections/llm-visibility/VisibilityPanel";

// Import header components
import HeaderBrandKit from "@/components/shared/header/BrandKit/BrandKit";
import HeaderWrapper from "@/components/shared/header/Wrapper/Wrapper";
import HeaderDropdownWrapper from "@/components/shared/header/Dropdown/Wrapper/Wrapper";
import GithubIcon from "@/components/shared/header/Github/_svg/GithubIcon";
import ButtonUI from "@/components/ui/shadcn/button";

// Import visibility types
import { VisibilityReport } from "@/lib/visibility-analyzer";

// Import icons
import { Eye, Sparkles, Loader2, Bot } from "lucide-react";

// VisibilityReport from visibility-analyzer is used directly

export default function LLMVisibilityPage() {
  const [tab, setTab] = useState<Endpoint>(Endpoint.Scrape);
  const [url, setUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [visibilityData, setVisibilityData] = useState<VisibilityReport | null>(null);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [urlError, setUrlError] = useState<string>("");
  const [analysisStatus, setAnalysisStatus] = useState("");

  // Check for API keys on mount
  useEffect(() => {
    fetch('/api/check-config')
      .then(res => res.json())
      .then(data => {
        setHasOpenRouterKey(data.hasOpenRouterKey || false);
      })
      .catch(() => setHasOpenRouterKey(false));
  }, []);

  const handleAnalysis = async () => {
    if (!url) return;

    // Auto-prepend https:// if no protocol is provided
    let processedUrl = url.trim();
    if (!processedUrl.match(/^https?:\/\//i)) {
      processedUrl = 'https://' + processedUrl;
    }

    // Validate URL format
    try {
      const urlObj = new URL(processedUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        setUrlError('Please enter a valid URL (e.g., example.com)');
        return;
      }
    } catch (error) {
      setUrlError('Please enter a valid URL (e.g., example.com)');
      return;
    }

    setIsAnalyzing(true);
    setShowResults(false);
    setVisibilityData(null);
    setAnalysisStatus("Extracting brand information...");

    try {
      // Call the LLM visibility API
      const response = await fetch('/api/llm-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: processedUrl }),
      });

      const data = await response.json();

      if (data.success) {
        // Set the full visibility report
        setVisibilityData(data as VisibilityReport);
        setIsAnalyzing(false);
        setShowResults(true);
      } else {
        console.error('Analysis failed:', data.error);
        setIsAnalyzing(false);
        alert(data.error || 'Failed to analyze brand visibility. Please try again.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
      alert('An error occurred while analyzing visibility.');
    }
  };

  return (
    <HeaderProvider>
      <div className="min-h-screen bg-background-base">
        {/* Header/Navigation Section */}
        <HeaderDropdownWrapper />

        <div className="sticky top-0 left-0 w-full z-[101] bg-background-base header">
          <div className="absolute top-0 cmw-container border-x border-border-faint h-full pointer-events-none" />

          <div className="h-1 bg-border-faint w-full left-0 -bottom-1 absolute" />

          <div className="cmw-container absolute h-full pointer-events-none top-0">
            <Connector className="absolute -left-[10.5px] -bottom-11" />
            <Connector className="absolute -right-[10.5px] -bottom-11" />
          </div>

          <HeaderWrapper>
            <div className="max-w-[900px] mx-auto w-full flex justify-between items-center">
              <div className="flex gap-24 items-center">
                <HeaderBrandKit />
              </div>

              <div className="flex gap-8">
                {/* GitHub Template Button */}
                <a
                  className="contents"
                  href="https://github.com/firecrawl/ai-ready-website"
                  target="_blank"
                >
                  <ButtonUI variant="tertiary">
                    <GithubIcon />
                    Use this Template
                  </ButtonUI>
                </a>
              </div>
            </div>
          </HeaderWrapper>
        </div>

        {/* Hero Section */}
        <section className="overflow-x-clip" id="home-hero">
          <div className={`pt-28 lg:pt-254 lg:-mt-100 pb-115 relative`} id="hero-content">
            <HomeHeroPixi />
            <HeroFlame />
            <BackgroundOuterPiece />
            <HomeHeroBackground />

            <AnimatePresence mode="wait">
              {!isAnalyzing && !showResults ? (
                <motion.div
                  key="hero"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="relative container px-16"
                >
                  {/* Custom Badge */}
                  <div className="flex justify-center mb-16">
                    <div className="inline-flex items-center gap-8 px-12 py-6 bg-heat-4 border border-heat-100 border-opacity-20 rounded-full">
                      <Eye className="w-14 h-14 text-heat-100" />
                      <span className="text-label-small text-heat-100 font-medium">
                        LLM Visibility Checker
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-title-h1 text-center text-accent-black mb-16">
                    Is Your Brand Visible<br />
                    <span className="text-heat-100">in AI Answers?</span>
                  </h1>

                  <p className="text-center text-body-large text-black-alpha-64 max-w-500 mx-auto">
                    Check if ChatGPT, Claude, Gemini, Perplexity and other LLMs
                    mention your brand when users ask relevant questions.
                  </p>

                  <Link
                    className="bg-black-alpha-4 hover:bg-black-alpha-6 rounded-6 px-8 lg:px-6 text-label-large h-30 lg:h-24 flex items-center mt-12 mx-auto w-max gap-6 transition-all"
                    href="#"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Sparkles className="w-14 h-14 text-heat-100" />
                    Powered by FlipAEO
                  </Link>
                </motion.div>
              ) : isAnalyzing ? (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative container px-16 text-center"
                >
                  <div className="flex flex-col items-center gap-24">
                    <div className="relative">
                      <Loader2 className="w-48 h-48 text-heat-100 animate-spin" />
                      <Bot className="w-24 h-24 text-heat-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <h2 className="text-title-h2 text-accent-black mb-8">
                        Checking LLM Visibility
                      </h2>
                      <p className="text-body-large text-black-alpha-64">
                        Querying ChatGPT, Claude, Gemini, Grok, and Mistral...
                      </p>
                      <p className="text-label-small text-heat-100 mt-8">
                        {analysisStatus}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative container px-16"
                  style={{ marginTop: '-35px' }}
                >
                  {visibilityData && (
                    <VisibilityPanel
                      report={visibilityData}
                      onReset={() => {
                        setIsAnalyzing(false);
                        setShowResults(false);
                        setVisibilityData(null);
                        setUrl("");
                      }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mini Playground Input - Only show when not analyzing */}
          {!isAnalyzing && !showResults && (
            <motion.div
              className="container lg:contents !p-16 relative -mt-90"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute top-0 left-[calc(50%-50vw)] w-screen h-1 bg-border-faint lg:hidden" />
              <div className="absolute bottom-0 left-[calc(50%-50vw)] w-screen h-1 bg-border-faint lg:hidden" />

              <Connector className="-top-10 -left-[10.5px] lg:hidden" />
              <Connector className="-top-10 -right-[10.5px] lg:hidden" />
              <Connector className="-bottom-10 -left-[10.5px] lg:hidden" />
              <Connector className="-bottom-10 -right-[10.5px] lg:hidden" />

              {/* Hero Input Component */}
              <div className="max-w-552 mx-auto w-full relative z-[11] lg:z-[2] rounded-20 -mt-30 lg:-mt-30">
                <div
                  className="overlay bg-accent-white"
                  style={{
                    boxShadow:
                      "0px 0px 44px 0px rgba(0, 0, 0, 0.02), 0px 88px 56px -20px rgba(0, 0, 0, 0.03), 0px 56px 56px -20px rgba(0, 0, 0, 0.02), 0px 32px 32px -20px rgba(0, 0, 0, 0.03), 0px 16px 24px -12px rgba(0, 0, 0, 0.03), 0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 0px 0px 10px #F9F9F9",
                  }}
                />

                <div className="p-16 flex gap-12 items-center w-full relative">
                  <Globe />

                  <input
                    className={`flex-1 bg-transparent text-body-input text-accent-black placeholder:text-black-alpha-48 focus:outline-none focus:ring-0 focus:border-transparent ${urlError ? 'text-heat-200' : ''}`}
                    placeholder="Enter your brand website (e.g., stripe.com)"
                    type="text"
                    value={url}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setUrl(newUrl);
                      if (urlError) setUrlError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && url.length > 0) {
                        e.preventDefault();
                        handleAnalysis();
                      }
                    }}
                  />

                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      if (url.length > 0) {
                        handleAnalysis();
                      }
                    }}
                  >
                    <HeroInputSubmitButton dirty={url.length > 0} tab={tab} />
                  </div>
                </div>

                {/* Error message */}
                {urlError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-24 left-16 text-heat-200 text-label-small"
                  >
                    {urlError}
                  </motion.div>
                )}

                <div className="h-248 top-84 cw-768 pointer-events-none absolute overflow-clip -z-10">
                  <AsciiExplosion className="-top-200" />
                </div>
              </div>

              {/* Hero Scraping Animation */}
              <HeroScraping />
            </motion.div>
          )}
        </section>
      </div>
    </HeaderProvider>
  );
}