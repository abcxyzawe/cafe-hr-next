"use client";

import { useEffect } from "react";
import { recordRecentEmployee } from "@/lib/recent-employees";

type Props = {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
};

export function TrackVisit({ id, name, avatarUrl, role }: Props) {
  useEffect(() => {
    recordRecentEmployee({ id, name, avatarUrl, role });
  }, [id, name, avatarUrl, role]);
  return null;
}
