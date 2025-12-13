export interface RelatedKeywordMetric {
  keyword: string;
  searchVolume: string;
  competition: string;
  keywordType: 'Short-tail' | 'Long-tail';
}

export interface KeywordMetric {
  keyword: string;
  searchVolume: string; // Keep as string to handle ranges or "N/A" cleanly, then parse for charts
  competition: 'Low' | 'Medium' | 'High' | 'Unknown' | string;
  difficulty: string; // SEO Difficulty
  recommendation: string;
  rationale: string; // Explanation for the recommendation
  relatedKeywords: RelatedKeywordMetric[]; // 5 Better alternatives with stats
  keywordType: 'Short-tail' | 'Long-tail'; // Classification
  isQuickWin: boolean; // True if good volume + low competition
  siteAudit?: string; // Performance/Ranking check for user's site
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface AnalysisResult {
  metrics: KeywordMetric[];
  summary: string;
  groundingChunks: GroundingChunk[];
}

export interface SearchParams {
  keywords: string;
  location: string;
  website?: string;
}