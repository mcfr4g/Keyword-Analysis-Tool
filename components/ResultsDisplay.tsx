import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { AnalysisResult } from '../types';
import { ExternalLink, TrendingUp, AlertTriangle, CheckCircle, BarChart2, Info, Lightbulb, Zap, Download, Layers, Globe, ChevronDown, ChevronUp, Search, Bug, Code, ArrowRight } from 'lucide-react';

interface ResultsDisplayProps {
  data: AnalysisResult;
}

// Helper to convert volume strings to numbers for charting
const parseVolume = (volStr: string): number => {
  if (!volStr) return 0;
  const s = volStr.toLowerCase();
  if (s.includes('unavailable') || s.includes('n/a') || s.includes('unknown')) return 0;
  
  if (s.includes('high')) return 80; 
  if (s.includes('medium')) return 50;
  if (s.includes('low')) return 20;

  let cleanStr = s.replace(/,/g, '');
  
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-').map(p => parseVolume(p.trim()));
    if (parts.length === 2) {
      return Math.round((parts[0] + parts[1]) / 2);
    }
  }

  let multiplier = 1;
  if (cleanStr.includes('k')) {
    multiplier = 1000;
    cleanStr = cleanStr.replace('k', '');
  } else if (cleanStr.includes('m')) {
    multiplier = 1000000;
    cleanStr = cleanStr.replace('m', '');
  } else if (cleanStr.includes('+')) {
      cleanStr = cleanStr.replace('+', '');
  }

  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num * multiplier;
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data }) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const chartData = data.metrics.map(m => {
    const volume = parseVolume(m.searchVolume);
    return {
      name: m.keyword,
      volume: volume,
      originalVolume: m.searchVolume,
      competition: m.competition
    };
  });

  const hasChartableData = chartData.some(d => d.volume > 0);
  const hasSiteAudit = data.metrics.some(m => m.siteAudit && m.siteAudit !== 'N/A');

  const getCompetitionColor = (comp: string, isBg = false) => {
    const c = (comp || '').toLowerCase();
    if (c.includes('high')) return isBg ? 'bg-red-50 text-red-700' : 'text-red-600 border-red-200 bg-red-50';
    if (c.includes('medium')) return isBg ? 'bg-yellow-50 text-yellow-700' : 'text-yellow-600 border-yellow-200 bg-yellow-50';
    if (c.includes('low')) return isBg ? 'bg-green-50 text-green-700' : 'text-green-600 border-green-200 bg-green-50';
    return isBg ? 'bg-gray-50 text-gray-700' : 'text-gray-600 border-gray-200 bg-gray-50';
  };

  const getBarColor = (comp: string) => {
    const c = (comp || '').toLowerCase();
    if (c.includes('high')) return '#EF4444'; 
    if (c.includes('medium')) return '#EAB308'; 
    if (c.includes('low')) return '#22C55E'; 
    return '#9CA3AF'; 
  };

  const handleDownloadCSV = () => {
    if (!data.metrics.length) return;

    // Define CSV Headers
    const headers = [
        'Keyword', 'Volume', 'Competition', 'Difficulty', 
        'Type', 'Quick Win', 'Site Audit', 'Recommendation', 'Rationale', 'Better Alternatives'
    ];

    // Map rows
    const rows = data.metrics.map(m => [
        `"${m.keyword.replace(/"/g, '""')}"`,
        `"${m.searchVolume}"`,
        `"${m.competition}"`,
        `"${m.difficulty}"`,
        `"${m.keywordType}"`,
        m.isQuickWin ? 'Yes' : 'No',
        `"${(m.siteAudit || 'N/A').replace(/"/g, '""')}"`,
        `"${m.recommendation.replace(/"/g, '""')}"`,
        `"${m.rationale.replace(/"/g, '""')}"`,
        `"${(m.relatedKeywords || []).map(r => `${r.keyword} [${r.searchVolume} | ${r.competition}]`).join(', ').replace(/"/g, '""')}"`
    ]);

    // Construct CSV String
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `seo_analysis_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">Executive Summary</h3>
            </div>
            {data.metrics.length > 0 && (
                <button 
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm active:scale-95"
                >
                    <Download className="w-4 h-4" />
                    Download CSV
                </button>
            )}
        </div>
        <div className="prose prose-blue max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
          {data.summary}
        </div>
        {data.metrics.length === 0 && (
           <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                  <p className="font-semibold">No structured data found.</p>
                  <p className="text-sm">The model could not find specific volume data to populate the table. Please rely on the summary above or try broader keywords.</p>
              </div>
           </div>
        )}
      </div>

      {/* Charts Section */}
      {hasChartableData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-800">Volume & Competition Visualization</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  height={80} 
                  tick={{fontSize: 12}}
                />
                <YAxis 
                   tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={((value: any, name: any, props: any) => {
                    if (name === 'volume' && props && props.payload) {
                        return [props.payload.originalVolume, 'Volume'];
                    }
                    return [value, name];
                  }) as any}
                />
                <Legend />
                <Bar dataKey="volume" name="Search Volume / Interest" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.competition)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {data.metrics.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <h3 className="text-xl font-bold text-gray-800">Detailed Keyword Analysis</h3>
           <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500 fill-amber-500"/> Quick Win</span>
              <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-blue-500"/> Long/Short Tail</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 italic">Expand rows to see Alternatives & SERP</span>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-gray-200 w-12"></th>
                <th className="p-4 font-semibold border-b border-gray-200 w-[20%]">Keyword</th>
                <th className="p-4 font-semibold border-b border-gray-200 w-[15%]">Stats</th>
                <th className="p-4 font-semibold border-b border-gray-200 w-[10%]">Diff.</th>
                {hasSiteAudit && (
                    <th className="p-4 font-semibold border-b border-gray-200 w-[15%]">My Site Audit</th>
                )}
                <th className="p-4 font-semibold border-b border-gray-200">Recommendation & Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.metrics.map((metric, idx) => (
                  <React.Fragment key={idx}>
                  <tr 
                    className={`hover:bg-blue-50/50 transition-colors group cursor-pointer ${expandedRows.includes(idx) ? 'bg-blue-50/30' : ''}`}
                    onClick={() => toggleRow(idx)}
                  >
                    <td className="p-4 align-top">
                        <button 
                            className={`p-1 rounded-full transition-colors ${expandedRows.includes(idx) ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100'}`}
                            title="View Alternatives & SERP"
                        >
                            {expandedRows.includes(idx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </td>
                    <td className="p-4 align-top">
                        <div className="font-medium text-gray-900">{metric.keyword}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {metric.isQuickWin && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    Quick Win
                                </span>
                            )}
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                <Layers className="w-3 h-3" />
                                {metric.keywordType}
                            </span>
                        </div>
                    </td>
                    <td className="p-4 align-top space-y-1">
                        <div>
                        {metric.searchVolume?.toLowerCase().includes('unavailable') ? (
                            <span className="flex items-center gap-1 text-gray-400 italic text-sm" title="Exact data not publicly indexed">
                                <Info className="w-3 h-3" /> N/A
                            </span>
                        ) : (
                            <span className="font-mono text-gray-700 text-sm bg-gray-100 px-2 py-0.5 rounded block w-fit">
                                {metric.searchVolume}
                            </span>
                        )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getCompetitionColor(metric.competition)}`}>
                            Comp: {metric.competition || 'Unk'}
                        </span>
                    </td>
                    <td className="p-4 text-gray-600 align-top text-sm">{metric.difficulty || 'N/A'}</td>
                    {hasSiteAudit && (
                        <td className="p-4 align-top">
                            {metric.siteAudit ? (
                                <span className="flex items-start gap-1.5 text-xs text-gray-700 bg-indigo-50 border border-indigo-100 p-2 rounded">
                                    <Globe className="w-3 h-3 mt-0.5 text-indigo-500 flex-shrink-0" />
                                    {metric.siteAudit}
                                </span>
                            ) : (
                                <span className="text-gray-400 text-xs">-</span>
                            )}
                        </td>
                    )}
                    <td className="p-4 text-gray-600 text-sm align-top">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-2 font-medium text-gray-900 leading-tight">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {metric.recommendation}
                            </div>
                            {metric.rationale && (
                                <div className="flex items-start gap-2 text-gray-500 bg-gray-50 p-2 rounded text-xs leading-relaxed">
                                    <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                                    {metric.rationale}
                                </div>
                            )}
                        </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row Content */}
                  {expandedRows.includes(idx) && (
                    <tr className="bg-gray-50/50">
                        <td colSpan={100} className="p-0">
                            <div className="p-6 border-y border-gray-200 animate-in fade-in slide-in-from-top-1 duration-300 space-y-8">
                                
                                {/* 1. Better Alternatives Table */}
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                     <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                                          <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                             <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
                                             Top 10 High-Potential Alternatives
                                          </h4>
                                          <span className="text-xs text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100 shadow-sm">
                                             Recommended Substitutes
                                          </span>
                                     </div>
                                     <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                                                    <th className="px-5 py-3 text-left font-medium w-[25%]">Alternative Keyword</th>
                                                    <th className="px-5 py-3 text-left font-medium w-[35%]">Why it's better (Strategy)</th>
                                                    <th className="px-5 py-3 text-left font-medium w-[15%]">Type</th>
                                                    <th className="px-5 py-3 text-right font-medium w-[15%]">Volume</th>
                                                    <th className="px-5 py-3 text-center font-medium w-[10%]">Comp.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {metric.relatedKeywords && metric.relatedKeywords.length > 0 ? (
                                                    metric.relatedKeywords.map((rk, k) => (
                                                        <tr key={k} className="hover:bg-indigo-50/30 transition-colors">
                                                            <td className="px-5 py-3 text-gray-900 font-medium">
                                                                {rk.keyword}
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-600 leading-snug">
                                                                {rk.whyBetter ? (
                                                                    <div className="flex items-start gap-1.5">
                                                                        <ArrowRight className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                                                        {rk.whyBetter}
                                                                    </div>
                                                                ) : '-'}
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">
                                                                    {rk.keywordType}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-right font-mono text-gray-700">
                                                                {rk.searchVolume}
                                                            </td>
                                                            <td className="px-5 py-3 text-center">
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${getCompetitionColor(rk.competition, true)}`}>
                                                                    {rk.competition}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-5 py-4 text-center text-gray-400 italic">
                                                            No alternative recommendations found for this keyword.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                     </div>
                                </div>

                                {/* 2. SERP Results */}
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                     <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                                            <Search className="w-4 h-4 text-gray-500" />
                                            Top 10 Google Search Results (SERP)
                                        </h4>
                                     </div>
                                    <div className="p-5">
                                        {metric.serpResults && metric.serpResults.length > 0 ? (
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {metric.serpResults.map((serp, sIdx) => (
                                                    <div key={sIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mt-0.5">
                                                                {serp.position}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <a href={serp.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline text-sm block truncate">
                                                                    {serp.title}
                                                                </a>
                                                                <div className="text-green-700 text-xs truncate mb-1">{serp.url}</div>
                                                                <p className="text-xs text-gray-500 line-clamp-2">{serp.snippet}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-gray-500 text-sm italic py-4 text-center bg-white rounded border border-dashed border-gray-300">
                                                No specific SERP data returned for this keyword.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Grounding Sources */}
      {data.groundingChunks && data.groundingChunks.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Data Verified From Sources
          </h4>
          <ul className="space-y-2">
            {data.groundingChunks.map((chunk, idx) => {
              if (chunk.web?.uri) {
                return (
                  <li key={idx}>
                    <a 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm group"
                    >
                      <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      {chunk.web.title || chunk.web.uri}
                    </a>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      )}

      {/* Debug JSON Section */}
      <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="w-full flex items-center justify-between p-4 text-left text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            <span>Debug Raw Data (JSON)</span>
          </div>
          {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDebug && (
          <div className="p-4 border-t border-gray-200 bg-gray-900 overflow-x-auto">
             <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs">
                <Code className="w-3 h-3" /> Raw API Response
             </div>
             <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
               {JSON.stringify(data.metrics, null, 2)}
             </pre>
          </div>
        )}
      </div>

    </div>
  );
};

export default ResultsDisplay;