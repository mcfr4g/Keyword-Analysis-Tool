import React from 'react';
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
import { ExternalLink, TrendingUp, AlertTriangle, CheckCircle, BarChart2, Info, Lightbulb, Zap, Download, Layers, Globe } from 'lucide-react';

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
        'Type', 'Quick Win', 'Site Audit', 'Recommendation', 'Rationale', 'Better Alternatives (Format: Keyword [Vol | Comp])'
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
        <div className="prose prose-blue max-w-none text-gray-600 whitespace-pre-wrap">
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
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'volume') return [props.payload.originalVolume, 'Volume'];
                    return [value, name];
                  }}
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
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-gray-200 w-[15%]">Keyword</th>
                <th className="p-4 font-semibold border-b border-gray-200 w-[12%]">Stats</th>
                <th className="p-4 font-semibold border-b border-gray-200 w-[10%]">Difficulty</th>
                {hasSiteAudit && (
                    <th className="p-4 font-semibold border-b border-gray-200 w-[15%]">My Site Audit</th>
                )}
                <th className={`p-4 font-semibold border-b border-gray-200 ${hasSiteAudit ? 'w-[25%]' : 'w-[30%]'}`}>Recommendation & Rationale</th>
                <th className="p-4 font-semibold border-b border-gray-200 w-[28%]">Better Alternatives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {data.metrics.map((metric, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
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
                            <div className="flex items-start gap-2 font-medium text-gray-900">
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
                    <td className="p-4 align-top">
                        <div className="flex flex-col gap-2">
                            {metric.relatedKeywords && metric.relatedKeywords.length > 0 ? (
                                metric.relatedKeywords.map((rk, k) => (
                                    <div key={k} className="flex flex-col p-2 bg-white rounded border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-gray-800 text-xs">{rk.keyword}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <span className="bg-gray-50 px-1 rounded">{rk.searchVolume}</span>
                                            <span className={`px-1 rounded ${getCompetitionColor(rk.competition, true)}`}>
                                                {rk.competition}
                                            </span>
                                            <span className="text-gray-400">| {rk.keywordType}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span className="text-gray-400 text-xs italic">None found</span>
                            )}
                        </div>
                    </td>
                  </tr>
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
    </div>
  );
};

export default ResultsDisplay;