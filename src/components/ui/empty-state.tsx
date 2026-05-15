import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * Optional decorative illustration rendered ABOVE the icon.
   * Pass a string URL to render an <img>, or any ReactNode to render directly.
   * Constrained to 200px max width and centered.
   */
  illustration?: string | React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
  illustration,
}: EmptyStateProps) {
  const sizes = {
    sm: { wrap: "py-6", iconBox: "size-10", icon: "size-5", title: "text-sm" },
    md: { wrap: "py-10", iconBox: "size-14", icon: "size-7", title: "text-base" },
    lg: { wrap: "py-14", iconBox: "size-20", icon: "size-10", title: "text-lg" },
  } as const;
  const s = sizes[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4",
        s.wrap,
        className,
      )}
    >
      {illustration !== undefined && illustration !== null && (
        typeof illustration === "string" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={illustration}
            alt=""
            className="mb-4 max-w-[200px] w-full h-auto object-contain"
          />
        ) : (
          <div className="mb-4 flex w-full max-w-[200px] items-center justify-center">
            {illustration}
          </div>
        )
      )}
      {Icon && (
        <div
          className={cn(
            "mb-3 flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            s.iconBox,
          )}
        >
          <Icon className={s.icon} />
        </div>
      )}
      <h3 className={cn("font-semibold text-foreground", s.title)}>{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
