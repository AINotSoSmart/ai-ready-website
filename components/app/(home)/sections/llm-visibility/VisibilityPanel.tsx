"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { VisibilityReport } from "@/lib/visibility-analyzer";
import RadarChart from "../ai-readiness/RadarChart";
import { LLMProvider, LLM_MODELS } from "@/lib/openrouter";
import {
    ArrowLeft,
    ArrowUpRight,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    Minus
} from "lucide-react";

interface VisibilityPanelProps {
    report: VisibilityReport;
    onReset: () => void;
}

export default function VisibilityPanel({ report, onReset }: VisibilityPanelProps) {
    const [viewMode, setViewMode] = useState<'overview' | 'queries'>('overview');
    const [expandedSections, setExpandedSections] = useState({
        competitors: true,
        opportunities: true,
        recommendations: true
    });

    const toggleSection = (key: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Prepare data for radar chart
    const radarData = Object.entries(report.llmScores).map(([key, value]) => ({
        label: LLM_MODELS[key as LLMProvider]?.label || key,
        score: value.score
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[1000px] mx-auto"
        >
            {/* Header - Brand Info */}
            <div className="text-center mb-32">
                <p className="text-label-small text-black-alpha-48 uppercase tracking-wider mb-8">
                    LLM Visibility Report
                </p>
                <h2 className="text-title-h2 text-accent-black mb-8">
                    {report.brand.name}
                </h2>
                <p className="text-body-medium text-black-alpha-64">
                    {report.brand.product}
                </p>
            </div>

            {/* Main Scores - Clean Grid */}
            <div className="grid grid-cols-4 gap-1 bg-black-alpha-8 rounded-12 overflow-hidden mb-32">
                <div className="bg-accent-white p-20 text-center">
                    <div className="text-title-h1 font-semibold text-accent-black">
                        {report.overallScore}%
                    </div>
                    <div className="text-label-small text-black-alpha-48">
                        Visibility Score
                    </div>
                </div>
                <div className="bg-accent-white p-20 text-center">
                    <div className="text-title-h1 font-semibold text-accent-black">
                        {report.shareOfVoice}%
                    </div>
                    <div className="text-label-small text-black-alpha-48">
                        Share of Voice
                    </div>
                </div>
                <div className="bg-accent-white p-20 text-center">
                    <div className="text-title-h1 font-semibold text-heat-100">
                        {report.positionBreakdown.first}
                    </div>
                    <div className="text-label-small text-black-alpha-48">
                        #1 Mentions
                    </div>
                </div>
                <div className="bg-accent-white p-20 text-center">
                    <div className="text-title-h1 font-semibold text-accent-black">
                        {report.opportunities.length}
                    </div>
                    <div className="text-label-small text-black-alpha-48">
                        Opportunities
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-black-alpha-8 rounded-8 p-1 mb-24 w-max mx-auto">
                {['overview', 'queries'].map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode as any)}
                        className={`px-20 py-8 rounded-6 text-label-medium font-medium transition-all ${viewMode === mode
                                ? 'bg-accent-white text-accent-black shadow-sm'
                                : 'text-black-alpha-48 hover:text-accent-black'
                            }`}
                    >
                        {mode === 'overview' ? 'Overview' : 'Queries'}
                    </button>
                ))}
            </div>

            {viewMode === 'overview' && (
                <div className="space-y-24">
                    {/* Per-LLM Grid */}
                    <div className="grid grid-cols-5 gap-1 bg-black-alpha-8 rounded-12 overflow-hidden">
                        {Object.entries(report.llmScores).map(([key, value]) => {
                            const model = LLM_MODELS[key as LLMProvider];
                            return (
                                <div key={key} className="bg-accent-white p-16 text-center">
                                    <div className="text-label-medium font-medium text-accent-black mb-4">
                                        {model?.label}
                                    </div>
                                    <div className={`text-title-h2 font-semibold ${value.score >= 50 ? 'text-heat-100' : 'text-black-alpha-32'
                                        }`}>
                                        {value.score}%
                                    </div>
                                    <div className="flex items-center justify-center gap-4 mt-4">
                                        {value.sentiment === 'positive' && (
                                            <span className="text-label-x-small text-heat-100">positive</span>
                                        )}
                                        {value.sentiment === 'negative' && (
                                            <span className="text-label-x-small text-black-alpha-48">negative</span>
                                        )}
                                        {value.sentiment === 'neutral' && (
                                            <span className="text-label-x-small text-black-alpha-32">neutral</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Competitor Comparison */}
                    {Object.keys(report.competitorScores).length > 0 && (
                        <div className="border border-black-alpha-8 rounded-12 overflow-hidden">
                            <button
                                onClick={() => toggleSection('competitors')}
                                className="w-full flex items-center justify-between p-16 bg-black-alpha-2 hover:bg-black-alpha-4 transition-all"
                            >
                                <span className="text-label-medium font-medium text-accent-black">
                                    Competitor Comparison
                                </span>
                                {expandedSections.competitors ? <ChevronUp className="w-16 h-16" /> : <ChevronDown className="w-16 h-16" />}
                            </button>

                            {expandedSections.competitors && (
                                <div className="p-20 space-y-16">
                                    {/* Your brand */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-8">
                                                <span className="text-label-medium font-semibold text-accent-black">
                                                    {report.brand.name}
                                                </span>
                                                <span className="text-label-x-small text-heat-100 bg-heat-4 px-6 py-2 rounded-4">
                                                    You
                                                </span>
                                            </div>
                                            <span className="text-label-medium font-semibold text-accent-black">
                                                {report.shareOfVoice}%
                                            </span>
                                        </div>
                                        <div className="h-8 bg-black-alpha-8 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-heat-100 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${report.shareOfVoice}%` }}
                                                transition={{ delay: 0.2, duration: 0.8 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Competitors */}
                                    {Object.entries(report.competitorScores).map(([name, score], index) => (
                                        <div key={name}>
                                            <div className="flex items-center justify-between mb-6">
                                                <span className="text-label-medium text-black-alpha-64">{name}</span>
                                                <span className="text-label-medium text-black-alpha-64">{score}%</span>
                                            </div>
                                            <div className="h-8 bg-black-alpha-8 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-black-alpha-24 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${score}%` }}
                                                    transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Query Opportunities */}
                    {report.opportunities.length > 0 && (
                        <div className="border border-black-alpha-8 rounded-12 overflow-hidden">
                            <button
                                onClick={() => toggleSection('opportunities')}
                                className="w-full flex items-center justify-between p-16 bg-black-alpha-2 hover:bg-black-alpha-4 transition-all"
                            >
                                <span className="text-label-medium font-medium text-accent-black">
                                    Query Opportunities ({report.opportunities.length})
                                </span>
                                {expandedSections.opportunities ? <ChevronUp className="w-16 h-16" /> : <ChevronDown className="w-16 h-16" />}
                            </button>

                            {expandedSections.opportunities && (
                                <div className="divide-y divide-black-alpha-8">
                                    {report.opportunities.map((opp, index) => (
                                        <div key={index} className="p-16">
                                            <p className="text-body-medium text-accent-black mb-8">
                                                "{opp.query}"
                                            </p>
                                            <div className="flex flex-wrap gap-8 text-label-x-small text-black-alpha-48">
                                                <span>Competitors: {opp.competitorsMentioned.join(', ')}</span>
                                                <span>•</span>
                                                <span>Missing in: {opp.llms.join(', ')}</span>
                                                <span className={`ml-auto px-6 py-2 rounded-4 ${opp.impact === 'high' ? 'bg-heat-4 text-heat-100' :
                                                        opp.impact === 'medium' ? 'bg-black-alpha-8 text-black-alpha-64' :
                                                            'bg-black-alpha-4 text-black-alpha-48'
                                                    }`}>
                                                    {opp.impact}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recommendations */}
                    <div className="border border-black-alpha-8 rounded-12 overflow-hidden">
                        <button
                            onClick={() => toggleSection('recommendations')}
                            className="w-full flex items-center justify-between p-16 bg-black-alpha-2 hover:bg-black-alpha-4 transition-all"
                        >
                            <span className="text-label-medium font-medium text-accent-black">
                                Recommendations
                            </span>
                            {expandedSections.recommendations ? <ChevronUp className="w-16 h-16" /> : <ChevronDown className="w-16 h-16" />}
                        </button>

                        {expandedSections.recommendations && (
                            <div className="divide-y divide-black-alpha-8">
                                {report.recommendations.map((rec, index) => (
                                    <div key={index} className="p-16 flex items-start gap-12">
                                        <div className={`w-6 h-6 rounded-full mt-6 flex-shrink-0 ${rec.priority === 'high' ? 'bg-heat-100' :
                                                rec.priority === 'medium' ? 'bg-black-alpha-48' :
                                                    'bg-black-alpha-24'
                                            }`} />
                                        <div className="flex-1">
                                            <p className="text-body-medium text-accent-black mb-4">
                                                {rec.action}
                                            </p>
                                            <p className="text-label-small text-black-alpha-48">
                                                {rec.reason}
                                            </p>
                                            <span className="text-label-x-small text-heat-100 mt-8 inline-block">
                                                {rec.impact}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Radar Chart */}
                    <div className="flex justify-center py-16">
                        <RadarChart data={radarData} size={320} />
                    </div>
                </div>
            )}

            {viewMode === 'queries' && (
                <div className="space-y-12">
                    {report.queryResults.map((qr, index) => (
                        <div key={index} className="border border-black-alpha-8 rounded-12 overflow-hidden">
                            <div className="p-16 bg-black-alpha-2">
                                <span className="text-label-x-small text-black-alpha-48 uppercase">
                                    {qr.query.type}
                                </span>
                                <p className="text-body-medium text-accent-black mt-4">
                                    "{qr.query.query}"
                                </p>
                            </div>
                            <div className="grid grid-cols-5 divide-x divide-black-alpha-8">
                                {Object.entries(qr.llmResults).map(([key, result]) => (
                                    <div
                                        key={key}
                                        className={`p-12 text-center ${result.isMentioned ? 'bg-heat-4' : 'bg-accent-white'
                                            }`}
                                    >
                                        <div className="text-label-small font-medium text-accent-black">
                                            {result.label}
                                        </div>
                                        <div className={`text-label-medium mt-4 ${result.isMentioned ? 'text-heat-100' : 'text-black-alpha-32'
                                            }`}>
                                            {result.isMentioned ? (
                                                <span className="flex items-center justify-center gap-4">
                                                    <Check className="w-14 h-14" /> #{result.position}
                                                </span>
                                            ) : (
                                                <X className="w-14 h-14 mx-auto" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reset Button */}
            <div className="flex justify-center mt-32">
                <button
                    onClick={onReset}
                    className="px-24 py-12 border border-black-alpha-8 hover:bg-black-alpha-4 rounded-8 text-label-medium transition-all flex items-center gap-8"
                >
                    <ArrowLeft className="w-16 h-16" />
                    Check Another Brand
                </button>
            </div>
        </motion.div>
    );
}
