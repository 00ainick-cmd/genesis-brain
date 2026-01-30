import { useState, useEffect } from 'react';
import { 
  Inbox, 
  Zap, 
  Clock, 
  FolderKanban, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ActionItem } from '../components/ActionItem';
import { QuickCapture } from '../components/QuickCapture';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { getDashboard, type DashboardResponse } from '../lib/api';
import { formatDateTime } from '../lib/utils';

export function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getDashboard();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return <Loading message="Loading dashboard..." />;
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetchData} className="btn btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary;
  const topActions = data?.topActions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">
            Last updated: {data?.timestamp ? formatDateTime(data.timestamp) : 'N/A'}
          </p>
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

      {/* Quick Capture */}
      <QuickCapture onCapture={fetchData} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Inbox" 
          value={summary?.inbox || 0} 
          icon={Inbox}
          highlight={summary?.inbox ? summary.inbox > 0 : false}
        />
        <StatCard 
          title="Next Actions" 
          value={summary?.nextActions || 0} 
          icon={Zap}
        />
        <StatCard 
          title="Waiting" 
          value={summary?.waiting || 0} 
          icon={Clock}
        />
        <StatCard 
          title="Projects" 
          value={summary?.activeProjects || 0} 
          icon={FolderKanban}
        />
        <StatCard 
          title="Overdue" 
          value={summary?.overdue || 0} 
          icon={AlertTriangle}
          highlight={summary?.overdue ? summary.overdue > 0 : false}
        />
      </div>

      {/* Top Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#00FF41]" />
          <h2 className="text-lg font-semibold text-white">Top Actions</h2>
          <span className="text-xs text-gray-500 font-mono">
            ({topActions.length})
          </span>
        </div>

        {topActions.length === 0 ? (
          <EmptyState 
            icon={Zap}
            title="No actions available"
            description="Add some actions to get started"
          />
        ) : (
          <div className="space-y-3">
            {topActions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
