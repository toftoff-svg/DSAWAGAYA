"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Cafe } from "../../../Admin2/_lib/menu";
import HomeReturnButton from "../../../_components/HomeReturnButton";

export default function Header({ cafe }: { cafe: Cafe }) {
  const pathname = usePathname() ?? "";

  // Works whatever the folder is called (/Employee or /employee)
  const base = "/" + (pathname.split("/")[1] ?? "");
  const onQueue = pathname.endsWith("/queue");

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm ${
        active ? "emp-solid font-semibold" : "opacity-70"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="emp-bd border-b bg-white/70 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6">
        {/* top left: logo + store name */}
        <div className="flex items-center gap-3">
          <div className="emp-photo grid h-10 w-10 place-items-center rounded-2xl border text-lg font-black">
            {cafe.logo ? <Image src={cafe.logo} alt="" width={40} height={40} unoptimized className="h-full w-full object-contain" /> : cafe.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xl font-bold tracking-tight">{cafe.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <nav className="emp-bd flex rounded-full border p-1">
            {tab(base, "Orders", !onQueue)}
            {tab(`${base}/queue`, "Queue", onQueue)}
          </nav>

          <HomeReturnButton requireCode={false} />

        </div>
      </div>
    </header>
  );
}
