"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // If the user already dismissed or installed, don't show
    if (typeof window !== "undefined") {
      const dismissed = window.localStorage.getItem("nourishthali_pwa_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered on user action
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    // Show the browser install prompt
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setIsVisible(false);
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nourishthali_pwa_dismissed", "true");
    }
  }

  if (!isVisible || isDismissed || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-6 sm:right-6 sm:left-auto"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#708C74]/40 bg-[#FAF7F2] p-4 shadow-[0_12px_36px_rgba(20,36,27,0.18)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2D4A3E] text-white shadow-xs">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#14241B]">
              Install NourishThali App
            </h4>
            <p className="text-xs text-[#526358]">
              Add to your home screen for quick 1-tap access and fullscreen meal planning.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleInstallClick}
            className="rounded-full bg-[#2D4A3E] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1E3528]"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#738278] hover:bg-[#EAE4D8] hover:text-[#14241B]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

