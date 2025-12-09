"use client";

// import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();
import { UserProvider } from '@/hooks/useUserInfo';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <main>
          {children}
        </main>
        <Toaster position="bottom-right" richColors closeButton />
      </UserProvider>
    </QueryClientProvider>
  );
}
