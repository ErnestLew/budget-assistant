"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { setAuthToken } from "@/lib/api-client";
import { StoreProvider } from "@/app/store-provider";

interface ProvidersProps {
  children: ReactNode;
}

function AuthSync({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    setAuthToken(session?.backendToken ?? null);
  }, [session?.backendToken]);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <StoreProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthSync>
            {children}
          </AuthSync>
        </ThemeProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
