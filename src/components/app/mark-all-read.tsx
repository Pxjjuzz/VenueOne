"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markNotificationsReadAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => startTransition(async () => { await markNotificationsReadAction(); })}
    >
      <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Mark all read
    </Button>
  );
}
