'use client';

import useSWR from 'swr';
import AlertItem from '@/components/AlertItem';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AlertsPage() {
  const { data, isLoading } = useSWR('/api/alerts', fetcher, {
    refreshInterval: 15000,
  });

  return (
    <div className="p-4 space-y-4 pb-20 md:pb-4">
      <h1 className="text-lg font-bold text-slate-200">Alerts</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#111827] rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : data?.alerts?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-slate-400 text-sm">No alerts</p>
          <p className="text-slate-600 text-xs mt-1">All accounts are running normally</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.alerts?.map((alert: any) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
