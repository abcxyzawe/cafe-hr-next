"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signIn, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: LoginState = { ok: false };

type Labels = {
  email: string;
  password: string;
  submit: string;
  demoHint: string;
};

export function LoginForm({ next, labels }: { next: string; labels: Labels }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">{labels.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue="admin@cafe.vn"
          placeholder="admin@cafe.vn"
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{labels.password}</Label>
          <a
            href="#"
            aria-disabled="true"
            className="text-xs text-muted-foreground/80 hover:text-primary aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            Quên mật khẩu?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue="admin"
          placeholder="••••••••"
          className="h-11"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-gradient-to-r from-primary to-primary/80 shadow-md transition-shadow hover:shadow-lg"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        {labels.submit}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {labels.demoHint}: <code className="font-mono">admin@cafe.vn</code> /{" "}
        <code className="font-mono">admin</code>
      </p>
    </form>
  );
}
