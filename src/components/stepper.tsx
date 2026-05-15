import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperStep = {
  label: string;
  description?: string;
};

export type StepperProps = {
  steps: StepperStep[];
  /** 0-based index of current step. Steps before are "done", current is current, after are pending. */
  current: number;
  vertical?: boolean;
  /** Optional click handler. If provided, steps become buttons. */
  onStepClick?: (index: number) => void;
  className?: string;
};

type StepState = "done" | "current" | "pending";

function getStepState(index: number, current: number): StepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "pending";
}

type CircleProps = {
  state: StepState;
  index: number;
  clickable: boolean;
  onClick?: () => void;
  label: string;
};

function StepCircle({ state, index, clickable, onClick, label }: CircleProps): React.ReactElement {
  const base =
    "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors";
  const stateClass =
    state === "done"
      ? "bg-emerald-500 text-white"
      : state === "current"
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground border border-border";
  const interactive = clickable
    ? "cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    : "";

  const content = (
    <>
      {state === "current" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/60 animate-pulse"
        />
      ) : null}
      {state === "done" ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <span>{index + 1}</span>
      )}
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label} (step ${index + 1})`}
        aria-current={state === "current" ? "step" : undefined}
        className={cn(base, stateClass, interactive)}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      role="img"
      aria-label={`${label} (step ${index + 1})`}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(base, stateClass)}
    >
      {content}
    </span>
  );
}

export function Stepper(props: StepperProps): React.ReactElement {
  const { steps, current, vertical = false, onStepClick, className } = props;
  const clickable = typeof onStepClick === "function";

  if (vertical) {
    return (
      <ol className={cn("flex flex-col", className)} aria-label="Progress">
        {steps.map((step, index) => {
          const state = getStepState(index, current);
          const isLast = index === steps.length - 1;
          const connectorClass =
            state === "done" ? "bg-emerald-500" : "bg-muted";

          return (
            <li key={`${step.label}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepCircle
                  state={state}
                  index={index}
                  clickable={clickable}
                  onClick={clickable ? () => onStepClick?.(index) : undefined}
                  label={step.label}
                />
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={cn("my-1 w-0.5 flex-1 min-h-6", connectorClass)}
                  />
                ) : null}
              </div>
              <div className={cn("pb-6", isLast && "pb-0")}>
                <div
                  className={cn(
                    "text-sm font-medium",
                    state === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {step.label}
                </div>
                {step.description ? (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol
      className={cn("flex w-full items-start", className)}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const state = getStepState(index, current);
        const isLast = index === steps.length - 1;
        const connectorClass =
          state === "done" ? "bg-emerald-500" : "bg-muted";

        return (
          <li
            key={`${step.label}-${index}`}
            className={cn(
              "flex flex-col items-center",
              !isLast && "flex-1",
            )}
          >
            <div className="flex w-full items-center">
              <div className="flex justify-center" style={{ minWidth: "2rem" }}>
                <StepCircle
                  state={state}
                  index={index}
                  clickable={clickable}
                  onClick={clickable ? () => onStepClick?.(index) : undefined}
                  label={step.label}
                />
              </div>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn("h-0.5 flex-1 mx-2", connectorClass)}
                />
              ) : null}
            </div>
            <div className="mt-2 text-center px-1">
              <div
                className={cn(
                  "text-xs font-medium",
                  state === "pending"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {step.label}
              </div>
              {step.description ? (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {step.description}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
