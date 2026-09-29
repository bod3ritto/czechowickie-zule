"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "./button";
import { useOptionalMap } from "@/components/map/map-context";

/** Web Share API when available (mobile), clipboard otherwise. */
export function ShareButton({ path, title, text }: { path: string; title: string; text?: string }) {
  const map = useOptionalMap();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      map?.notify("Link skopiowany do schowka.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      map?.notify(url, "Skopiuj link ręcznie");
    }
  };

  return (
    <Button size="sm" onClick={share} aria-label="Udostępnij link">
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Skopiowano" : "Udostępnij"}
    </Button>
  );
}
