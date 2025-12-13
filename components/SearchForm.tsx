import React, { useState, useCallback } from 'react';
import { Search, MapPin, Loader2, UploadCloud, FileText, Globe } from 'lucide-react';

interface SearchFormProps {
  onSearch: (keywords: string, location: string, website?: string) => void;
  isLoading: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.trim() && location.trim()) {
      onSearch(keywords, location, website);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (file.type === "text/plain" || file.name.endsWith('.csv') || file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          // If CSV, implies we might need to split by comma, but standard text area works well with commas/newlines too.
          // We append to existing keywords if any.
          setKeywords(prev => prev ? `${prev}\n${text}` : text);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please drop a valid text (.txt) or CSV (.csv) file.");
    }
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">SEO Keyword Explorer</h2>
        <p className="text-gray-500">
          Enter keywords manually or drag & drop a file to get real-time search volume estimates via Google Search.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
            Keywords (comma separated or newline)
          </label>
          <div 
            className={`relative group transition-all duration-200 rounded-lg ${isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., vegan restaurants, plant based diet, healthy food delivery"
              className={`w-full min-h-[120px] p-3 pl-4 border rounded-lg outline-none transition-all resize-y text-gray-800
                ${isDragging ? 'border-blue-400 bg-transparent' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
              `}
              required
            />
            {/* Overlay hint for drag and drop */}
            {!keywords && !isDragging && (
                <div className="absolute top-3 right-3 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                    <UploadCloud className="w-5 h-5 text-gray-500" />
                </div>
            )}
            {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-blue-50/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-blue-400">
                    <div className="text-blue-600 font-medium flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Drop file to load keywords
                    </div>
                </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
             Supports .txt and .csv drag & drop
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
            <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Target Location
            </label>
            <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., New York, NY"
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800"
                required
                />
            </div>
            </div>

            <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                My Website (Optional)
            </label>
            <div className="relative">
                <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g., https://mysite.com"
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800"
                />
            </div>
            </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !keywords.trim() || !location.trim()}
          className={`w-full flex items-center justify-center py-3 px-6 rounded-lg text-white font-semibold text-lg transition-all
            ${isLoading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 active:scale-[0.99]'
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Analyzing with Google Search...
            </>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              Get Search Volumes
            </>
          )}
        </button>
      </form>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100 text-xs text-blue-700">
        <strong>Accuracy Note:</strong> This tool uses Gemini with Google Search Grounding to find publicly available search volume data. 
        It does not access private Google Ads accounts. Results are accurate estimates found in search indices.
      </div>
    </div>
  );
};

export default SearchForm;