"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useState } from "react";

// Queries que se persisten en IndexedDB para que el Checklist funcione sin
// conexión. El resto (leaderboards, ligas, etc.) NO se persiste: esas secciones
// requieren internet y muestran un aviso cuando el usuario está offline.
const PERSISTED_QUERIES = new Set([
  "goals",
  "goalsHistory",
  "todayChecks",
  "monthChecks",
  "dateChecks",
  "groups", // useMyGroups → ["groups", userId]
  // "offlineChecks" NO se persiste aquí: su queryFn relee el store durable de
  // IndexedDB (la caché de Query no serializa Blobs).
]);

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            // gcTime alto para que las queries persistidas no se descarten y
            // sigan disponibles al abrir la app sin conexión.
            gcTime: WEEK_MS,
          },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: "olympo-query-cache",
      // idb-keyval sobre IndexedDB (soporta más tamaño que localStorage).
      storage: {
        getItem: (k) => get(k),
        setItem: (k, v) => set(k, v),
        removeItem: (k) => del(k),
      },
      throttleTime: 1000,
    })
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: WEEK_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            PERSISTED_QUERIES.has(query.queryKey[0] as string),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
