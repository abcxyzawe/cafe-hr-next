import Link from "next/link";
import { Coffee, Sparkles } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="hidden border-t bg-card/30 px-8 py-3 text-xs text-muted-foreground lg:flex lg:items-center lg:justify-between print:hidden">
      <div className="flex items-center gap-1.5">
        <Coffee className="size-3.5 text-primary/70" aria-hidden />
        <span>
          Cafe HR · <span className="opacity-70">v1.0 · {new Date().getFullYear()}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/changelog"
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <Sparkles className="size-3" />
          Cập nhật mới
        </Link>
        <Link
          href="/help"
          className="transition-colors hover:text-foreground"
        >
          Trợ giúp
        </Link>
        <span className="opacity-50">·</span>
        <span className="opacity-60">Made with care</span>
      </div>
    </footer>
  );
}
