"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { checkCode, hasCode } from "../Admin2/_lib/actions";
import PinKeypad from "./PinKeypad";

export default function HomeReturnButton({ requireCode = true }: { requireCode?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<Array<"admin" | "employee">>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const resetPrompt = () => {
      setOpen(false);
      setCode("");
      setError(null);
    };
    window.addEventListener("pageshow", resetPrompt);
    return () => window.removeEventListener("pageshow", resetPrompt);
  }, []);

  const closePrompt = () => {
    setOpen(false);
    setCode("");
    setError(null);
  };

  const start = async () => {
    if (!requireCode) {
      try {
        sessionStorage.removeItem("wagaya-admin-ok");
        sessionStorage.removeItem("wagaya-employee-ok");
      } catch {}
      router.push("/");
      return;
    }

    setError(null);
    setCode("");
    setBusy(true);
    const configured = (
      await Promise.all(
        (["admin", "employee"] as const).map(async (role) =>
          (await hasCode(role)) ? role : null
        )
      )
    ).filter((role): role is "admin" | "employee" => role !== null);
    setBusy(false);
    setRoles(configured);
    if (configured.length === 0) {
      try {
        sessionStorage.removeItem("wagaya-employee-ok");
      } catch {}
      return router.push("/");
    }
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const valid = await Promise.all(roles.map((role) => checkCode(role, code))).then((results) => results.some(Boolean));
    setBusy(false);
    if (!valid) {
      setCode("");
      return setError("That employee password is not correct.");
    }
    try {
      sessionStorage.removeItem("wagaya-employee-ok");
    } catch {}
    closePrompt();
    router.push("/");
  };

  return (
    <>
      <button type="button" onClick={start} disabled={busy} className="home-return-button rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50">
        Home
      </button>

      {mounted && open && createPortal(
        <div className="home-return-backdrop fixed inset-0 z-[2147483647] grid place-items-center p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-label="Home access code" onClick={(event) => event.stopPropagation()} className="home-return-dialog relative w-full max-w-sm rounded-[2rem] p-6">
            <button type="button" onClick={closePrompt} aria-label="Close password prompt" className="absolute right-4 top-3 text-2xl leading-none text-[#71806f] transition hover:text-[#153D2E]">
              ×
            </button>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#0e4bbe] text-lg font-black text-[#FFFDF6]">W</div>
              <h2 className="text-2xl font-bold">Return to Home</h2>
              <p className="mt-1 text-sm text-[#4C6B54]">Enter the admin or employee code to continue.</p>
            </div>
            <input
              autoFocus
              type="password"
              value={code}
              name="home-access-code"
              autoComplete="new-password"
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submit()}
              placeholder="Admin or employee code"
              className="home-return-input w-full rounded-xl px-3 py-2.5 text-center outline-none"
            />
            <PinKeypad
              disabled={busy}
              onDigit={(digit) => setCode((value) => value + digit)}
              onBackspace={() => setCode((value) => value.slice(0, -1))}
              onClear={() => setCode("")}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={closePrompt} className="home-return-cancel flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={submit} disabled={busy || !code} className="home-return-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {busy ? "Checking…" : "Continue"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
