import { useEffect, useRef } from "react";

const DEFAULT_HIDE_DELAY_MS = 700;

export function useTransientScrollbar<T extends HTMLElement>(hideDelayMs = DEFAULT_HIDE_DELAY_MS) {
  const scrollRef = useRef<T | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function showScrollbar(): void {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.classList.add("is-scrolling");

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      element.classList.remove("is-scrolling");
      timeoutRef.current = null;
    }, hideDelayMs);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    onScroll: showScrollbar,
    scrollRef,
    showScrollbar,
  };
}
