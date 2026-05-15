"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkIn, checkOut } from "./actions";

export function CheckInButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await checkIn(id);
            toast.success("Check-in thành công");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Lỗi");
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
      Check-in
    </Button>
  );
}

export function CheckOutButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await checkOut(id);
            toast.success("Check-out thành công");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Lỗi");
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Check-out
    </Button>
  );
}
