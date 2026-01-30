import { useState } from 'react';
import { Plus, Send, Loader2 } from 'lucide-react';
import { captureInbox } from '../lib/api';

interface QuickCaptureProps {
  onCapture?: () => void;
}

export function QuickCapture({ onCapture }: QuickCaptureProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading) return;

    setLoading(true);
    try {
      await captureInbox(value.trim());
      setValue('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onCapture?.();
    } catch (error) {
      console.error('Failed to capture:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#00FF41]/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-[#00FF41]" />
        </div>
        
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Quick capture... what's on your mind?"
          className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-600"
          disabled={loading}
        />
        
        <button
          type="submit"
          disabled={!value.trim() || loading}
          className={`
            p-2 rounded-lg transition-all
            ${value.trim() 
              ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' 
              : 'bg-[#1a1a1a] text-gray-600'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : success ? (
            <span className="text-xs">✓</span>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </form>
  );
}
