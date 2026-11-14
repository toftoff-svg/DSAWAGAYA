"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkCloudConnection } from "../Admin2/_lib/actions";

type CloudState = "checking" | "connected" | "offline";

export default function CloudStatus() {
  const pathname = usePathname() ?? "";
  const [state, setState] = useState<CloudState>("checking");
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (checking.current || document.visibilityState !== "visible") return;
    checking.current = true;
    setState("checking");
    try {
      const result = await checkCloudConnection();
      setState(result.ok ? "connected" : "offline");
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    check();
    const timer = window.setInterval(check, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [check]);

  if (pathname.startsWith("/Admin2")) return null;

  const connected = state === "connected";
  const offline = state === "offline";

  return (
    <button
      type="button"
      onClick={check}
      className="fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-left text-xs text-slate-700 shadow-lg backdrop-blur transition hover:opacity-75"
      role="status"
      aria-label={connected ? "Connected to cloud database" : offline ? "Database connection unavailable" : "Checking database connection"}
      title="Check cloud connection"
    >
      <span className={`cloud-pixel ${connected ? "cloud-pixel-connected" : offline ? "cloud-pixel-offline" : ""}`} aria-hidden="true">
        <span className="cloud-pixel-cloud" />
        <span className="cloud-pixel-person" />
        <span className="cloud-pixel-ground" />
      </span>
      <span>{connected ? "Cloud connected" : offline ? "Database offline" : "Checking cloud"}</span>
    </button>
  );
}
