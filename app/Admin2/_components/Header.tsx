"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Cafe } from "../_lib/menu";
import { checkCloudConnection } from "../_lib/actions";
import HomeReturnButton from "../../_components/HomeReturnButton";

const TABS: [string, string][] = [
  ["", "Orders"],
  ["/queue", "Queue"],
  ["/inventory", "Inventory"],
  ["/sales", "Sales"],
  ["/settings", "Settings"],
];

export default function Header({ cafe }: { cafe: Cafe }) {
  const pathname = usePathname() ?? "";
  const [cloud, setCloud] = useState<"checking" | "connected" | "offline">("checking");
  const checking = useRef(false);

  // works whatever the folder is called (/Admin or /admin)
  const base = "/" + (pathname.split("/")[1] ?? "");
  const rest = pathname.slice(base.length).replace(/\/$/, "");

  const checkCloud = useCallback(async () => {
    if (checking.current || document.visibilityState !== "visible") return;
    checking.current = true;
    setCloud("checking");
    try {
      const result = await checkCloudConnection();
      setCloud(result.ok ? "connected" : "offline");
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    checkCloud();
    const interval = window.setInterval(checkCloud, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkCloud();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkCloud]);

  return (
    <header className="border-b border-black/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="emp-bd grid h-10 w-10 place-items-center overflow-hidden rounded-[1.15rem] border text-lg font-black shadow-sm">
            {cafe.logo ? (
              <Image src={cafe.logo} alt="" width={40} height={40} unoptimized className="h-full w-full object-contain" />
            ) : (
              cafe.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-xl font-bold tracking-tight">{cafe.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="emp-island flex max-w-full flex-wrap rounded-full p-1">
            {TABS.map(([href, label]) => {
              const active = href === "" ? rest === "" : rest.startsWith(href);
              return (
                <Link
                  key={label}
                  href={`${base}${href}`}
                  className={`emp-island-button rounded-full px-3 py-1.5 text-sm ${
                    active ? "emp-island-active font-semibold" : "opacity-70"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <HomeReturnButton requireCode={false} />

          <div className="emp-island rounded-full px-2 py-1.5">
            <button
              type="button"
              onClick={checkCloud}
              className={`emp-cloud-status ${cloud} cursor-pointer rounded-full px-1 transition hover:opacity-75`}
              role="status"
              aria-label="Check cloud database connection"
              title="Check cloud connection"
            >
              <span className="emp-pixel-scene" aria-hidden="true">
                <span className="emp-pixel-cloud" />
                <span className="emp-pixel-person" />
                <span className="emp-pixel-ground" />
              </span>
              <span className="hidden text-[11px] font-medium sm:inline">
                {cloud === "connected" ? "Cloud connected" : cloud === "offline" ? "Database offline" : "Checking cloud"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
