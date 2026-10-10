import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCatalogManifestQueryOptions, getGetCatalogReleaseQueryOptions, getGetCatalogManifestQueryKey, getGetCatalogReleaseQueryKey } from '@workspace/api-client-react';
import { CatalogRepository, type CatalogEnvelope } from '@workspace/activity-catalog';
import starter from '@workspace/activity-catalog/starter';

const Context = createContext<CatalogRepository | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [repository] = useState(() => new CatalogRepository(AsyncStorage, {
    manifest: async () => {
      if (Platform.OS !== 'web' && !process.env.EXPO_PUBLIC_DOMAIN) {
        throw new Error('Catalog API origin is not configured. Set EXPO_PUBLIC_DOMAIN for this native build.');
      }
      return timed(signal => queryClient.fetchQuery(getGetCatalogManifestQueryOptions({
        query: { queryKey: getGetCatalogManifestQueryKey(), staleTime: 0, retry: false },
        request: { signal, credentials: 'omit', cache: 'no-store' },
      })));
    },
    release: version => timed(signal => queryClient.fetchQuery(getGetCatalogReleaseQueryOptions(version, {
      query: { queryKey: getGetCatalogReleaseQueryKey(version), staleTime: 0, retry: false },
      request: { signal, credentials: 'omit' },
    }))),
  }, starter as CatalogEnvelope));
  useEffect(() => {
    void repository.initialize().then(() => repository.refresh());
  }, [repository]);
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
async function timed<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try { return await request(controller.signal); }
  finally { clearTimeout(timer); }
}
export function useCatalog() {
  const repository = useContext(Context);
  if (!repository) throw new Error('CatalogProvider is missing.');
  const state = useSyncExternalStore(repository.subscribe, repository.getState, repository.getState);
  return { repository, state };
}
