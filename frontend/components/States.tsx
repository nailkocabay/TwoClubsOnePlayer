import { AlertTriangle, Loader2 } from "lucide-react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <span role="status" className="inline-flex items-center gap-2 text-mute"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{label}</span>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
      <div className="flex-1"><p className="text-red-100">{message}</p>
        {onRetry && <button onClick={onRetry} className="mt-2 font-medium text-red-200 underline underline-offset-2 hover:text-white">Try again</button>}
      </div>
    </div>
  );
}

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-xl border border-line bg-panel" />
      ))}
    </div>
  );
}
