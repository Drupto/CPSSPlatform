"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackToAdminButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={() => router.push("/admin")}
      className={`mb-4 ${className}`}
    >
      ← Back to Admin Panel
    </Button>
  );
}
