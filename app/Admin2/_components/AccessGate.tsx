"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkCode } from "../_lib/actions";
import PinKeypad from "../../_components/PinKeypad";

type Role = "admin" | "employee";

export default function AccessGate({ role, locked, children }: { role: Role; locked: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const key = `wagaya-${role}-ok`;
  const [state, setState] = useState<"checking" | "locked" | "open">(locked ? "checking" : "open");
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state !== "locked") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [state]);

  useEffect(() => {
    const syncState = () => {
      if (!locked) return setState("open");
      try {
        sessionStorage.removeItem(key);
      } catch {
      }
      setCode("");
      setWrong(false);
      setState("locked");
    };
    const lockOnPageExit = () => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
    };

    syncState();
    window.addEventListener("pagehide", lockOnPageExit);
    window.addEventListener("pageshow", syncState);
    return () => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
      window.removeEventListener("pagehide", lockOnPageExit);
      window.removeEventListener("pageshow", syncState);
    };
  }, [key, locked]);

  const submit = async () => {
    setBusy(true);
    setWrong(false);
    const okCode = await checkCode(role, code);
    setBusy(false);
    if (okCode) {
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
      setState("open");
    } else {
      setCode("");
      setWrong(true);
    }
  };

  if (state === "checking") return null;
  if (state === "open") return <>{children}</>;

  return (
    <div className="home-return-backdrop fixed inset-0 z-[9999] grid place-items-center p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-label={`${role === "admin" ? "Admin" : "Employee"} access code`} className="home-return-dialog relative w-full max-w-sm rounded-[2rem] p-6">
        <button type="button" onClick={() => router.push("/")} aria-label="Close password prompt" className="absolute right-4 top-3 text-2xl leading-none text-[#71806f] transition hover:text-[#153D2E]">
          ×
        </button>
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#204F37] text-lg font-black text-[#FFFDF6]">
            {role === "admin" ? "A" : "E"}
          </div>
          <h1 className="text-2xl font-bold">{role === "admin" ? "Admin access" : "Employee access"}</h1>
          <p className="mt-1 text-sm text-[#4C6B54]">Enter your {role} code to continue.</p>
        </div>
        <input
          type="password"
          autoFocus
          name={`${role}-access-code`}
          autoComplete="new-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="home-return-input w-full rounded-xl px-3 py-2.5 text-center outline-none"
          placeholder={`${role === "admin" ? "Admin" : "Employee"} code`}
        />
        <PinKeypad
          disabled={busy}
          onDigit={(digit) => setCode((value) => value + digit)}
          onBackspace={() => setCode((value) => value.slice(0, -1))}
          onClear={() => setCode("")}
        />
        {wrong && <p className="mt-2 text-sm text-red-700">That code isn’t right. Try again.</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !code}
          className="home-return-button mt-5 w-full rounded-xl py-2.5 font-bold disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}
