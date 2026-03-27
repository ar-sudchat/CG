'use client';

import { cn } from '@/lib/utils';

interface InsightData {
  bb_width: number;
  bb_threshold: number;
  slope: number;
  slope_dir: string;
  slope_threshold: number;
  rsi: number;
  rng_signal: string;
  atr_ratio: number;
  bb_pos: string;
  bb_pos_pct: number;
  ma20: number;
  mode: string;
  trend_reason: string;
  price_vs_ma: number;
  m15_dir: string;
  m15_pips: number;
  last_action: string;
  next_event: string;
  next_event_min: number;
}

function fmtMin(min: number): string {
  if (min <= 0) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export default function InsightPanel({ insight }: { insight: InsightData | null }) {
  if (!insight) return null;

  const i = insight;
  const bbWide = i.bb_width > i.bb_threshold;
  const slopeOk = i.slope < i.slope_threshold;
  const atrOk = i.atr_ratio <= 1.5;
  const isRange = i.mode === 'RANGE';

  // RSI status
  let rsiLabel = 'neutral';
  let rsiClr = 'text-slate-400';
  if (i.rsi >= 65) { rsiLabel = 'OB'; rsiClr = 'text-red-400'; }
  else if (i.rsi <= 35) { rsiLabel = 'OS'; rsiClr = 'text-cyan-400'; }
  else if (i.rsi >= 55) { rsiLabel = 'bullish'; rsiClr = 'text-green-400'; }
  else if (i.rsi <= 45) { rsiLabel = 'bearish'; rsiClr = 'text-red-400'; }

  // Range signal color
  const rngClr = i.rng_signal === 'BUY' ? 'text-cyan-400'
    : i.rng_signal === 'SELL' ? 'text-red-400'
    : i.rng_signal.includes('?') ? 'text-yellow-400'
    : 'text-slate-500';

  // Next event
  const nextTxt = i.next_event !== '-' && i.next_event_min > 0
    ? `${i.next_event} in ${fmtMin(i.next_event_min)}`
    : null;

  // Price vs MA color
  const pmaClr = Math.abs(i.price_vs_ma) < 5 ? 'text-yellow-400' : 'text-slate-300';

  return (
    <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-lg p-2.5 font-mono text-[11px] leading-[18px] space-y-0.5">
      <div className="text-[10px] text-slate-500 border-b border-slate-800 pb-1 mb-1">
        INSIGHT
        <span className={cn('ml-2 font-bold', isRange ? 'text-cyan-400' : 'text-yellow-400')}>
          {i.mode}
        </span>
      </div>

      {/* Line 1: BB + Slope */}
      <div className="flex flex-wrap gap-x-3">
        <span>
          <span className="text-slate-500">BB:</span>
          <span className={bbWide ? 'text-orange-400' : 'text-green-400'}>
            {Math.round(i.bb_width)}
          </span>
          <span className="text-slate-600">{'>'}{i.bb_threshold}</span>
          <span className={cn('ml-1 text-[10px]', bbWide ? 'text-orange-400' : 'text-green-400')}>
            {bbWide ? 'WIDE' : 'OK'}
          </span>
        </span>
        <span>
          <span className="text-slate-500">Slp:</span>
          <span className={slopeOk ? 'text-green-400' : 'text-orange-400'}>
            {i.slope.toFixed(0)}
          </span>
          <span className="text-slate-600">({i.slope_dir})</span>
          <span className="text-slate-600">{'<'}{i.slope_threshold}</span>
          <span className={cn('ml-1 text-[10px]', slopeOk ? 'text-green-400' : 'text-orange-400')}>
            {slopeOk ? 'OK' : 'HIGH'}
          </span>
        </span>
      </div>

      {/* Line 2: RSI + ATR */}
      <div className="flex flex-wrap gap-x-3">
        <span>
          <span className="text-slate-500">RSI:</span>
          <span className={rsiClr}>{i.rsi.toFixed(1)}</span>
          <span className={cn('ml-1 text-[10px]', rsiClr)}>{rsiLabel}</span>
        </span>
        {isRange && (
          <span>
            <span className="text-slate-500">RNG:</span>
            <span className={rngClr}>{i.rng_signal}</span>
          </span>
        )}
        <span>
          <span className="text-slate-500">ATR:</span>
          <span className={atrOk ? 'text-green-400' : 'text-red-400'}>
            {i.atr_ratio.toFixed(2)}x
          </span>
          <span className={cn('ml-1 text-[10px]', atrOk ? 'text-green-400' : 'text-red-400')}>
            {atrOk ? 'ok' : 'HIGH'}
          </span>
        </span>
      </div>

      {/* Line 3: BBpos + MA20 */}
      <div className="flex flex-wrap gap-x-3">
        <span>
          <span className="text-slate-500">BBpos:</span>
          <span className={
            i.bb_pos === 'UPPER' ? 'text-red-400' : i.bb_pos === 'LOWER' ? 'text-cyan-400' : 'text-slate-300'
          }>
            {i.bb_pos}
          </span>
          <span className="text-slate-500">({i.bb_pos_pct}%)</span>
        </span>
        <span>
          <span className="text-slate-500">MA20:</span>
          <span className="text-slate-300">{i.ma20.toFixed(2)}</span>
        </span>
      </div>

      {/* Line 4: Price vs MA + M15 */}
      <div className="flex flex-wrap gap-x-3">
        <span>
          <span className="text-slate-500">PrMA:</span>
          <span className={pmaClr}>
            {i.price_vs_ma >= 0 ? '+' : ''}{i.price_vs_ma.toFixed(1)}p
          </span>
        </span>
        <span>
          <span className="text-slate-500">M15:</span>
          <span className={
            i.m15_dir === 'UP' ? 'text-green-400' : i.m15_dir === 'DN' ? 'text-red-400' : 'text-yellow-400'
          }>
            {i.m15_dir}
          </span>
          <span className="text-slate-500">({i.m15_pips.toFixed(1)}p)</span>
        </span>
      </div>

      {/* Line 5: Trend reason */}
      <div className="text-slate-500 text-[10px]">
        {i.trend_reason}
      </div>

      {/* Line 6: Next event */}
      {nextTxt && (
        <div className={cn(
          'text-[10px]',
          i.next_event.includes('End') ? 'text-yellow-400' : 'text-slate-500'
        )}>
          {nextTxt}
        </div>
      )}
    </div>
  );
}
