"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareExerciseProps {
  /** Exercise title, used as the share text. */
  title: string;
}

/** Feature-detect navigator.share without effects or hydration mismatches. */
const emptySubscribe = () => () => {};
function useCanNativeShare(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/**
 * Share tools for an exercise page: copy the link (clipboard + sonner toast),
 * open the phone's native share sheet where available, and a WhatsApp link —
 * the way most families in Rajamahendravaram actually share a page.
 *
 * The current window URL is used at click time so the shared link always
 * matches the address the reader actually visited.
 */
export function ShareExercise({ title }: ShareExerciseProps) {
  const canNativeShare = useCanNativeShare();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  // Clear any pending "copied" reset when the bar unmounts.
  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied", {
        description:
          "Paste it into WhatsApp or an SMS to share these instructions with family.",
      });
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2600);
    } catch {
      // Clipboard unavailable (older browser or insecure context) — fail honestly.
      toast.error("Couldn't copy the link", {
        description: "Please copy it from your browser's address bar instead.",
      });
    }
  }

  async function shareNative() {
    try {
      await navigator.share({
        title,
        text: `${title} — exercise guide from Raphael Physiotherapy`,
        url: window.location.href,
      });
    } catch (error) {
      // The user closing the share sheet is not an error worth announcing.
      if ((error as { name?: string })?.name === "AbortError") return;
      toast.error("Sharing didn't complete", {
        description: "You can copy the link and send it instead.",
      });
    }
  }

  function shareWhatsApp() {
    const text = `${title} — ${window.location.href}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={copyLink} className="btn btn-ink h-11 text-[12px]">
        <span className="btn-sweep" aria-hidden="true" />
        {copied ? (
          <Check className="relative h-4 w-4 text-clay" aria-hidden="true" />
        ) : (
          <Link2 className="relative h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "Link copied" : "Copy link"}
      </button>
      {canNativeShare && (
        <button
          type="button"
          onClick={shareNative}
          className="btn btn-outline h-11 text-[12px]"
        >
          <span className="btn-sweep" aria-hidden="true" />
          <Share2 className="relative h-4 w-4" aria-hidden="true" />
          Share
        </button>
      )}
      <button
        type="button"
        onClick={shareWhatsApp}
        aria-label="Share this exercise on WhatsApp"
        className="btn btn-outline h-11 text-[12px]"
      >
        <span className="btn-sweep" aria-hidden="true" />
        <MessageCircle className="relative h-4 w-4" aria-hidden="true" />
        WhatsApp
      </button>
    </div>
  );
}
