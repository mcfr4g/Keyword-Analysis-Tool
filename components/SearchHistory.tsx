import React from 'react';
import { History, Trash2, ArrowRight } from 'lucide-react';
import { SearchHistoryItem } from '../types';

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
  onClear: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
          <History className="w-4 h-4" />
          Recent Searches
        </h3>
        <button 
          onClick={onClear}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" /> Clear History
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {history.map((item) => (
          <button
            key={item.timestamp}
            onClick={() => onSelect(item)}
            className="flex flex-col text-left p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all group relative overflow-hidden"
          >
            <div className="font-medium text-gray-800 text-sm truncate w-full mb-1 group-hover:text-blue-600">
              {item.keywords.split('\n')[0]} 
              {item.keywords.includes('\n') && <span className="text-xs text-gray-400 font-normal"> (+more)</span>}
            </div>
            <div className="flex items-center justify-between w-full mt-auto">
               <span className="text-xs text-gray-500 truncate max-w-[85%]">{item.location}</span>
               <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
            {item.website && (
                 <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-400 rounded-bl-md" title="Has website context"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;