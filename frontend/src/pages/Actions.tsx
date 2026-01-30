import { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Filter, 
  RefreshCw,
  Zap,
  X
} from 'lucide-react';
import { ActionItem } from '../components/ActionItem';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { getActions, type Action } from '../lib/api';
import { cn } from '../lib/utils';

const ENERGY_LEVELS = ['all', 'high', 'medium', 'low'] as const;
type EnergyFilter = typeof ENERGY_LEVELS[number];

export function Actions() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [energyFilter, setEnergyFilter] = useState<EnergyFilter>('all');
  const [contextFilter, setContextFilter] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getActions();
      setActions(result);
      setError(null);
    } catch (err) {
      setError('Failed to load actions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract unique contexts
  const contexts = useMemo(() => {
    const all = actions.flatMap((a) => a.context || []);
    return [...new Set(all)].sort();
  }, [actions]);

  // Filter actions
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (energyFilter !== 'all' && action.energy !== energyFilter) {
        return false;
      }
      if (contextFilter && !action.context?.includes(contextFilter)) {
        return false;
      }
      return true;
    });
  }, [actions, energyFilter, contextFilter]);

  const clearFilters = () => {
    setEnergyFilter('all');
    setContextFilter(null);
  };

  const hasFilters = energyFilter !== 'all' || contextFilter !== null;

  if (loading && actions.length === 0) {
    return <Loading message="Loading actions..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00FF41]/10 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-[#00FF41]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Actions</h1>
            <p className="text-sm text-gray-500 font-mono">
              {filteredActions.length} of {actions.length} actions
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

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-400">Filters</span>
          {hasFilters && (
            <button 
              onClick={clearFilters}
              className="text-xs text-[#00FF41] hover:underline ml-2"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Energy Filter */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
              Energy Level
            </label>
            <div className="flex flex-wrap gap-2">
              {ENERGY_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergyFilter(level)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-all font-mono',
                    energyFilter === level
                      ? 'bg-[#00FF41] text-black'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]'
                  )}
                >
                  {level === 'all' ? 'All' : (
                    <>
                      {level === 'high' && '⚡⚡⚡ '}
                      {level === 'medium' && '⚡⚡ '}
                      {level === 'low' && '⚡ '}
                      {level}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Context Filter */}
          {contexts.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                Context
              </label>
              <div className="flex flex-wrap gap-2">
                {contexts.map((ctx) => (
                  <button
                    key={ctx}
                    onClick={() => setContextFilter(contextFilter === ctx ? null : ctx)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg transition-all font-mono',
                      contextFilter === ctx
                        ? 'bg-[#00FF41] text-black'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]'
                    )}
                  >
                    {ctx}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions List */}
      {error ? (
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <EmptyState 
          icon={CheckSquare}
          title={hasFilters ? "No matching actions" : "No actions yet"}
          description={hasFilters ? "Try adjusting your filters" : "Actions will appear here when added"}
        />
      ) : (
        <div className="space-y-3">
          {filteredActions.map((action) => (
            <ActionItem key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
