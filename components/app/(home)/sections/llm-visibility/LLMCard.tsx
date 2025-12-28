"use client";

import { motion, AnimatePresence } from "framer-motion";
import { VisibilityReport } from "@/lib/visibility-analyzer";
import {
    CheckCircle2,
    XCircle,
    Quote,
    TrendingUp,
    TrendingDown,
    Minus,
    ExternalLink,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { useState } from "react";

interface LLMCardProps {
    result: VisibilityReport;
    index: number;
}

export default function LLMCard({ result, index }: LLMCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getSentimentIcon = () => {
        switch (result.sentiment) {
            case 'positive':
                return <TrendingUp className="w-14 h-14 text-green-500" />;
            case 'negative':
                return <TrendingDown className="w-14 h-14 text-red-500" />;
            default:
                return <Minus className="w-14 h-14 text-gray-400" />;
        }
    };

    const getSentimentColor = () => {
        switch (result.sentiment) {
            case 'positive':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'negative':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getScoreColor = () => {
        if (result.score >= 70) return 'text-green-600';
        if (result.score >= 40) return 'text-yellow-600';
        return 'text-gray-400';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-12 border border-black-alpha-8 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Header */}
            <div
                className="p-16 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-8">
                        <span className="text-24">{result.icon}</span>
                        <span className="text-label-large font-semibold text-accent-black">
                            {result.label}
                        </span>
                    </div>
                    <div className={`text-title-h3 font-bold ${getScoreColor()}`}>
                        {result.score}%
                    </div>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-8 mb-12">
                    {/* Mentioned badge */}
                    <div className={`inline-flex items-center gap-4 px-8 py-4 rounded-6 text-label-small ${result.isMentioned
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}>
                        {result.isMentioned ? (
                            <CheckCircle2 className="w-12 h-12" />
                        ) : (
                            <XCircle className="w-12 h-12" />
                        )}
                        {result.isMentioned ? 'Mentioned' : 'Not Mentioned'}
                        {result.mentionCount > 1 && (
                            <span className="ml-2 text-label-x-small">×{result.mentionCount}</span>
                        )}
                    </div>

                    {/* Cited badge */}
                    <div className={`inline-flex items-center gap-4 px-8 py-4 rounded-6 text-label-small ${result.isCited
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}>
                        {result.isCited ? (
                            <ExternalLink className="w-12 h-12" />
                        ) : (
                            <XCircle className="w-12 h-12" />
                        )}
                        {result.isCited ? 'Cited' : 'Not Cited'}
                    </div>

                    {/* Sentiment badge */}
                    {result.isMentioned && (
                        <div className={`inline-flex items-center gap-4 px-8 py-4 rounded-6 text-label-small border ${getSentimentColor()}`}>
                            {getSentimentIcon()}
                            {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                        </div>
                    )}
                </div>

                {/* Expand/Collapse indicator */}
                <div className="flex items-center justify-center text-black-alpha-32">
                    {isExpanded ? (
                        <ChevronUp className="w-16 h-16" />
                    ) : (
                        <ChevronDown className="w-16 h-16" />
                    )}
                </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-black-alpha-8"
                    >
                        <div className="p-16">
                            {/* Mention context */}
                            {result.mentionContext && (
                                <div className="mb-12">
                                    <div className="text-label-small text-black-alpha-48 mb-4">
                                        Context
                                    </div>
                                    <div className="flex gap-8 p-12 bg-heat-4 rounded-8 border-l-4 border-heat-100">
                                        <Quote className="w-16 h-16 text-heat-100 flex-shrink-0 mt-2" />
                                        <p className="text-body-small text-black-alpha-80 italic">
                                            {result.mentionContext}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Full response preview */}
                            {result.response && (
                                <div>
                                    <div className="text-label-small text-black-alpha-48 mb-4">
                                        Full Response
                                    </div>
                                    <div className="p-12 bg-black-alpha-4 rounded-8 max-h-200 overflow-y-auto">
                                        <p className="text-body-small text-black-alpha-64 whitespace-pre-wrap">
                                            {result.response.substring(0, 1000)}
                                            {result.response.length > 1000 && '...'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Error message */}
                            {result.error && (
                                <div className="p-12 bg-red-50 rounded-8 border border-red-200">
                                    <p className="text-body-small text-red-600">
                                        Error: {result.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
