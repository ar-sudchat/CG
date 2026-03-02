'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useUser() {
  const { data, error, mutate } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    user: data?.user || null,
    isLoading: !data && !error,
    isAdmin: data?.user?.role === 'admin',
    mutate,
  };
}
