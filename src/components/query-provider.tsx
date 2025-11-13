"use client";

import {QueryClientProvider} from "@tanstack/react-query";
import {QueryClient} from "@tanstack/query-core";

export default function QueryProvider({children}: {children: React.ReactNode}) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>;
}
