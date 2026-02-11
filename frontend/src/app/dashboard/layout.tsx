"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useUpdateUserMutation } from "@/store/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [updateUser] = useUpdateUserMutation();
  const timezoneSynced = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  // Auto-detect and sync user timezone once per session
  useEffect(() => {
    if (status === "authenticated" && !timezoneSynced.current) {
      timezoneSynced.current = true;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        updateUser({ timezone: tz });
      }
    }
  }, [status, updateUser]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950">
      <Sidebar />
      <div className="lg:pl-72">
        <Header user={session?.user} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
