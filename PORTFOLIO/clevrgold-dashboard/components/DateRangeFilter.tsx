'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const presets = [
  { label: 'Today', key: 'today' },
  { label: 'This Week', key: 'week' },
  { label: 'This Month', key: 'month' },
  { label: 'Last Month', key: 'last_month' },
  { label: 'All Time', key: 'all' },
  { label: 'Custom', key: 'custom' },
] as const;

type PresetKey = typeof presets[number]['key'];

function getPresetDates(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);

  switch (key) {
    case 'today':
      return { from: toStr, to: toStr };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + 1); // Monday
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: d.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    }
    case 'all':
      return { from: '', to: '' };
    default:
      return { from: '', to: '' };
  }
}

interface DateRangeFilterProps {
  onChange: (range: { from: string; to: string }) => void;
  defaultPreset?: PresetKey;
}

export default function DateRangeFilter({ onChange, defaultPreset = 'all' }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>(defaultPreset);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key !== 'custom') {
      const dates = getPresetDates(key);
      onChange(dates);
    }
  };

  const handleCustomApply = () => {
    onChange({ from: customFrom, to: customTo });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Period</span>
      {presets.map((p) => (
        <button
          key={p.key}
          onClick={() => handlePreset(p.key)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-mono rounded-full transition-colors',
            activePreset === p.key
              ? 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30'
              : 'text-slate-500 hover:text-slate-300 border border-[#1e2a3a]'
          )}
        >
          {p.label}
        </button>
      ))}
      {activePreset === 'custom' && (
        <div className="flex items-center gap-2 ml-1">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-[#0a0e17] border border-[#1e2a3a] rounded-lg px-2 py-1 text-[11px] text-slate-300 font-mono focus:border-[#eab308]/50 focus:outline-none"
          />
          <span className="text-slate-600 text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-[#0a0e17] border border-[#1e2a3a] rounded-lg px-2 py-1 text-[11px] text-slate-300 font-mono focus:border-[#eab308]/50 focus:outline-none"
          />
          <button
            onClick={handleCustomApply}
            className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-[#eab308] hover:bg-[#ca8a04] text-black transition-colors"
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
