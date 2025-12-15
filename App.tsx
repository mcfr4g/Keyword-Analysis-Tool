import React, { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import SearchHistory from './components/SearchHistory';
import { analyzeKeywords } from './services/geminiService';
import { AnalysisResult, SearchHistoryItem } from './types';
import { AlertCircle, Terminal } from 'lucide-react';

const App: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  // History State
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('searchHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Used to populate form when history item is clicked
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SearchHistoryItem | null>(null);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setHasApiKey(false);
    }
  }, []);

  const addToHistory = (keywords: string, location: string, website?: string) => {
    const newItem: SearchHistoryItem = { 
        keywords, 
        location, 
        website, 
        timestamp: Date.now() 
    };

    setHistory(prev => {
      // Filter out exact duplicates to avoid clutter, keeping the newest one
      const filtered = prev.filter(item => 
        !(item.keywords === keywords && item.location === location && item.website === website)
      );
      // Keep last 6 items
      const updated = [newItem, ...filtered].slice(0, 6);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
      setHistory([]);
      localStorage.removeItem('searchHistory');
  };

  const handleHistorySelect = (item: SearchHistoryItem) => {
      // Create a new object reference to ensure useEffect triggers in child
      setSelectedHistoryItem({ ...item });
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Auto trigger search
      handleSearch(item.keywords, item.location, item.website);
  };

  const handleSearch = async (keywords: string, location: string, website?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    // Save to history immediately
    addToHistory(keywords, location, website);

    try {
      const data = await analyzeKeywords(keywords, location, website);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasApiKey) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-l-4 border-red-500">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Error</h1>
                <p className="text-gray-600">
                    The <code>API_KEY</code> environment variable is missing. 
                    Please ensure the application is configured with a valid Google Gemini API Key.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 bg-opacity-90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                <Terminal className="h-6 w-6 text-white" />
             </div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                GeoSearch Analyst
             </h1>
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
             Powered by Gemini 2.5 Flash
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        
        {/* Search Section */}
        <section className="flex flex-col items-center">
            <SearchForm 
                onSearch={handleSearch} 
                isLoading={isLoading} 
                initialValues={selectedHistoryItem}
            />
            <SearchHistory 
                history={history} 
                onSelect={handleHistorySelect} 
                onClear={handleClearHistory} 
            />
        </section>

        {/* Error Feedback */}
        {error && (
            <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold">Analysis Failed</h3>
                    <p>{error}</p>
                </div>
            </div>
        )}

        {/* Results Section */}
        {result && (
            <section>
                <ResultsDisplay data={result} />
            </section>
        )}

      </main>
    </div>
  );
};

export default App;