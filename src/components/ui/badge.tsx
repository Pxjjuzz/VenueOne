import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Info,
  ShieldCheck,
  Undo2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/types";

const tones: Record<StatusTone, string> = {
  neutral: "bg-surface-secondary text-foreground-soft border-border",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-error-soft text-error border-error/25",
  info: "bg-info-soft text-info border-info/25",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const bookingIcons: Record<string, ReactNode> = {
  pending_owner_approval: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  awaiting_payment: <CircleDollarSign className="h-3 w-3" aria-hidden="true" />,
  confirmed: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  rejected: <XCircle className="h-3 w-3" aria-hidden="true" />,
  cancelled: <Ban className="h-3 w-3" aria-hidden="true" />,
  expired: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
  completed: <ShieldCheck className="h-3 w-3" aria-hidden="true" />,
};

const otherIcons: Record<string, ReactNode> = {
  draft: <FileText className="h-3 w-3" aria-hidden="true" />,
  submitted: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  under_review: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  approved: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  archived: <Ban className="h-3 w-3" aria-hidden="true" />,
  rejected: <XCircle className="h-3 w-3" aria-hidden="true" />,
  suspended: <Ban className="h-3 w-3" aria-hidden="true" />,
  unpublished: <Info className="h-3 w-3" aria-hidden="true" />,
  none: <Info className="h-3 w-3" aria-hidden="true" />,
  pending: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  requested: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  withdrawn: <Undo2 className="h-3 w-3" aria-hidden="true" />,
  initiated: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  processed: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  failed: <XCircle className="h-3 w-3" aria-hidden="true" />,
  paid: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  unpaid: <CircleDollarSign className="h-3 w-3" aria-hidden="true" />,
  processing: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  refunded: <Undo2 className="h-3 w-3" aria-hidden="true" />,
  partially_refunded: <Undo2 className="h-3 w-3" aria-hidden="true" />,
  captured: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  created: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  authorized: <ShieldCheck className="h-3 w-3" aria-hidden="true" />,
  new: <Info className="h-3 w-3" aria-hidden="true" />,
  read: <FileText className="h-3 w-3" aria-hidden="true" />,
  replied: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
};

export function StatusBadge({
  status,
  label,
  tone,
}: {
  status: string;
  label: string;
  tone: StatusTone;
}) {
  return (
    <Badge tone={tone} icon={bookingIcons[status] ?? otherIcons[status]}>
      {label}
    </Badge>
  );
}
