"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CUSTOMER_PATH } from "../_lib/menu";

const IDLE_MS = 5 * 60 * 1000; // 5 idle minutes

// When kiosk mode is on (Settings), go back to the customer screen after 5 idle minutes.
export default function KioskIdle() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          if (localStorage.getItem("wagaya-kiosk") === "on") router.push(CUSTOMER_PATH);
        } catch {}
      }, IDLE_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router]);

  return null;
}
