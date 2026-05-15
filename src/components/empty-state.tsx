import * as React from "react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "default" | "subtle" | "card";
export type EmptyStateSize = "sm" | "md" | "lg";

export type EmptyStateProps = {
  /** Optional icon node, e.g. `<Inbox className="..." />`. Rendered inside a circular muted bubble. */
  icon?: React.ReactNode;
  /** Main heading. Vietnamese is fine. */
  title: string;
  /** Secondary explainer line below the title. */
  description?: string;
  /** Optional primary CTA (e.g. `<Link>` or `<Button>`). */
  action?: React.ReactNode;
  /** Optional secondary CTA rendered next to `action`. */
  secondaryAction?: React.ReactNode;
  /** Visual container style. Default `"default"`. */
  variant?: EmptyStateVariant;
  /** Vertical padding + icon size scale. Default `"md"`. */
  size?: EmptyStateSize;
  className?: string;
};

const VARIANT_CLASSES: Record<EmptyStateVariant, string> = {
  default: "rounded-lg border border-dashed border-border bg-muted/30",
  subtle: "",
  card: "rounded-lg border border-border bg-card shadow-sm",
};

const SIZE_CONTAINER: Record<EmptyStateSize, string> = {
  sm: "py-6 px-4",
  md: "py-12 px-6",
  lg: "py-20 px-8",
};

const SIZE_BUBBLE: Record<EmptyStateSize, string> = {
  sm: "size-12",
  md: "size-16",
  lg: "size-24",
};

const SIZE_ICON_PX: Record<EmptyStateSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

/**
 * Empty state placeholder with optional icon, title, description, and CTAs.
 * Pure / server-renderable — safe to use in RSC and client trees.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  size = "md",
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        VARIANT_CLASSES[variant],
        SIZE_CONTAINER[size],
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            "mb-4 inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            SIZE_BUBBLE[size],
          )}
          style={{
            // Hint for callers using width/height-less SVG icons.
            ["--empty-state-icon-size" as string]: `${SIZE_ICON_PX[size]}px`,
          }}
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
