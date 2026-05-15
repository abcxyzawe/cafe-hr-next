"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
};

type SpeechRecognitionResultList = {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceDictateButton({
  onTranscript,
  lang = "vi-VN",
  className,
}: {
  /** Called with each finalized transcript chunk. Caller decides how to merge into the input. */
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const recog = new Ctor();
    recog.lang = lang;
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = (ev: SpeechRecognitionEvent) => {
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
        }
      }
      const trimmed = finalText.trim();
      if (trimmed) onTranscript(trimmed);
    };
    recog.onerror = () => {
      setListening(false);
    };
    recog.onend = () => {
      setListening(false);
    };
    try {
      recog.start();
      recogRef.current = recog;
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try {
      recogRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-pressed={listening}
      title={listening ? "Đang ghi âm — bấm để dừng" : "Đọc chính tả"}
      aria-label={listening ? "Dừng ghi âm" : "Bắt đầu đọc chính tả"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        listening && "animate-pulse border-rose-400/60 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
        className,
      )}
    >
      {listening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
    </button>
  );
}
