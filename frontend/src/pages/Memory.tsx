import { useState, useEffect, useMemo } from 'react';
import { 
  Brain, 
  Search, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { getMemories, type Memory } from '../lib/api';
import { cn, formatDateTime } from '../lib/utils';

export function MemoryView() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getMemories();
      setMemories(result);
      setError(null);
    } catch (err) {
      setError('Failed to load memories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract unique domains
  const domains = useMemo(() => {
    const all = memories.map((m) => m.domain);
    return [...new Set(all)].sort();
  }, [memories]);

  // Filter memories
  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      if (selectedDomain && memory.domain !== selectedDomain) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          memory.key.toLowerCase().includes(query) ||
          memory.content.toLowerCase().includes(query) ||
          memory.domain.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [memories, selectedDomain, searchQuery]);

  const copyContent = async (memory: Memory) => {
    await navigator.clipboard.writeText(memory.content);
    setCopiedId(memory.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading && memories.length === 0) {
    return <Loading message="Loading memories..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00FF41]/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[#00FF41]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Memory</h1>
            <p className="text-sm text-gray-500 font-mono">
              {filteredMemories.length} of {memories.length} memories
            </p>
          </div>
        </div>
        
        <button 
          onClick={fetchData}
          disabled={loading}
          className="btn btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-10 pr-4"
            />
          </div>

          {/* Domain Filter */}
          <select
            value={selectedDomain || ''}
            onChange={(e) => setSelectedDomain(e.target.value || null)}
            className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white"
          >
            <option value="">All domains</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Memories List */}
      {error ? (
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <EmptyState 
          icon={Brain}
          title={searchQuery || selectedDomain ? "No matching memories" : "No memories yet"}
          description="Memories will appear here as Genesis learns"
        />
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => (
            <div key={memory.id} className="card">
              <div 
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
              >
                <button className="mt-1 text-gray-500">
                  {expandedId === memory.id ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#00FF41]/10 text-[#00FF41] font-mono">
                      {memory.domain}
                    </span>
                    <span className="text-white font-medium truncate">
                      {memory.key}
                    </span>
                  </div>
                  
                  {expandedId !== memory.id && (
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {memory.content.substring(0, 100)}...
                    </p>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === memory.id && (
                <div className="mt-4 pl-7 border-l-2 border-[#2a2a2a]">
                  <div className="bg-[#0a0a0a] rounded-lg p-4 relative">
                    <button
                      onClick={() => copyContent(memory)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-[#1a1a1a] text-gray-400 hover:text-[#00FF41]"
                    >
                      {copiedId === memory.id ? (
                        <Check className="w-4 h-4 text-[#00FF41]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                      {memory.content}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-mono">
                    Updated: {formatDateTime(memory.updated_at)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
