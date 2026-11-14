"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../_components/Modal";
import {
  getOrderOptions,
  getSetting,
  getStarConfig,
  hasCode,
  saveCode,
  sendCurrentIngredients,
  sendPastSales,
  setSetting,
  setStarAuto,
  testSheets,
} from "../_lib/actions";
import { fileToDataUrl } from "../_lib/image";
import { DEFAULT_CAFE, type Cafe, type SheetsCfg } from "../_lib/menu";

type Role = "admin" | "employee";

export default function SettingsPage() {
  const router = useRouter();

  // cafe
  const [cafe, setCafe] = useState<Cafe>(DEFAULT_CAFE);
  const [cafeMsg, setCafeMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // kiosk (this device only)
  const [kiosk, setKiosk] = useState(false);
  const [queueTimeout, setQueueTimeout] = useState(10);
  const [queueTimeoutEnabled, setQueueTimeoutEnabled] = useState(false);
  const [queueTimeoutMsg, setQueueTimeoutMsg] = useState<string | null>(null);
  const [salesReset, setSalesReset] = useState<"manual" | "daily" | "weekly" | "monthly" | "yearly">("manual");
  const [salesResetMsg, setSalesResetMsg] = useState<string | null>(null);

  // codes
  const [codeSet, setCodeSet] = useState<Record<Role, boolean>>({ admin: false, employee: false });
  const [codeRole, setCodeRole] = useState<Role | null>(null);
  const [newCode, setNewCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);

  // quick order options + star
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [optMsg, setOptMsg] = useState<string | null>(null);
  const [starAuto, setStarAutoState] = useState(true);

  // google sheets
  const [sheets, setSheets] = useState<SheetsCfg>({ url: "", code: "", auto: false });
  const [sheetMsg, setSheetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setOptions(await getOrderOptions());
      setStarAutoState((await getStarConfig()).auto);
    })();
  }, []);

  useEffect(() => {
    try {
      setKiosk(localStorage.getItem("wagaya-kiosk") === "on");
    } catch {}
    (async () => {
      const [c, s, timeout, reset, a, e] = await Promise.all([
        getSetting("cafe"),
        getSetting("sheets"),
        getSetting("queueTimeout"),
        getSetting("salesReset"),
        hasCode("admin"),
        hasCode("employee"),
      ]);
      if (c.ok && c.data) setCafe({ ...DEFAULT_CAFE, ...(c.data as Partial<Cafe>) });
      if (s.ok && s.data) setSheets({ url: "", code: "", auto: false, ...(s.data as Partial<SheetsCfg>) });
      if (timeout.ok && timeout.data) {
        const value = timeout.data as { enabled?: boolean; minutes?: number } | number;
        if (typeof value === "number") {
          setQueueTimeout(Math.max(1, value));
          setQueueTimeoutEnabled(true);
        } else {
          setQueueTimeout(Math.max(1, Number(value.minutes) || 10));
          setQueueTimeoutEnabled(value.enabled === true);
        }
        if (reset.ok && reset.data) {
          const value = reset.data as { mode?: typeof salesReset };
          if (value.mode) setSalesReset(value.mode);
        }
      }
      setCodeSet({ admin: a, employee: e });
    })();
  }, []);

  /* ---- cafe ---- */
  const pickLogo = async (file?: File) => {
    if (!file) return;
    try {
      setCafe((c) => ({ ...c, logo: null }));
      const url = await fileToDataUrl(file, 256, "image/png");
      setCafe((c) => ({ ...c, logo: url }));
    } catch (e) {
      setCafeMsg(e instanceof Error ? e.message : "Couldn’t use that picture.");
    }
  };

  const saveCafe = async () => {
    const res = await setSetting("cafe", { name: cafe.name.trim() || DEFAULT_CAFE.name, logo: cafe.logo });
    setCafeMsg(res.ok ? "Saved." : `Couldn’t save: ${res.error}`);
    if (res.ok) router.refresh();
  };

  /* ---- kiosk ---- */
  const toggleKiosk = () => {
    const next = !kiosk;
    setKiosk(next);
    try {
      localStorage.setItem("wagaya-kiosk", next ? "on" : "off");
    } catch {}
  };

  const saveQueueTimeout = async () => {
    const minutes = Math.max(1, Math.min(1440, Math.floor(Number(queueTimeout) || 10)));
    setQueueTimeout(minutes);
    const res = await setSetting("queueTimeout", { enabled: queueTimeoutEnabled, minutes });
    setQueueTimeoutMsg(res.ok ? "Saved." : `Couldn’t save: ${res.error}`);
  };

  const saveSalesReset = async (mode: typeof salesReset) => {
    setSalesReset(mode);
    const res = await setSetting("salesReset", { mode, lastReset: new Date().toISOString() });
    setSalesResetMsg(res.ok ? "Saved." : `Couldn’t save: ${res.error}`);
  };

  /* ---- order options + star ---- */
  const saveOptions = async (list: string[]) => {
    setOptions(list);
    const res = await setSetting("options", list);
    setOptMsg(res.ok ? "Saved." : `Couldn’t save: ${res.error}`);
  };

  const addOption = async () => {
    const o = newOption.trim();
    if (!o || options.some((x) => x.toLowerCase() === o.toLowerCase())) return setNewOption("");
    setNewOption("");
    await saveOptions([...options, o]);
  };

  const toggleStarAuto = async (on: boolean) => {
    setStarAutoState(on);
    await setStarAuto(on);
  };

  /* ---- codes ---- */
  const openCode = (role: Role) => {
    setCodeRole(role);
    setNewCode("");
    setCodeErr(null);
  };

  const submitCode = async (clear = false) => {
    if (!codeRole) return;
    if (!clear && newCode.trim().length < 4) return setCodeErr("Use at least 4 characters.");
    const res = await saveCode(codeRole, clear ? "" : newCode);
    if (!res.ok) return setCodeErr(res.error);
    setCodeSet((c) => ({ ...c, [codeRole]: !clear }));
    setCodeRole(null);
  };

  /* ---- google sheets ---- */
  const saveSheets = async () => {
    const res = await setSetting("sheets", { url: sheets.url.trim(), code: sheets.code.trim(), auto: sheets.auto });
    setSheetMsg({ ok: res.ok, text: res.ok ? "Saved." : `Couldn’t save: ${res.error}` });
  };

  const testConnection = async () => {
    setSheetBusy(true);
    setSheetMsg(null);
    const res = await testSheets(sheets.url, sheets.code);
    setSheetBusy(false);
    setSheetMsg({ ok: res.ok, text: res.ok ? "Connected. Your sheet answered." : res.error });
  };

  const sendPast = async () => {
    setSheetBusy(true);
    setSheetMsg(null);
    const res = await sendPastSales();
    setSheetBusy(false);
    setSheetMsg({ ok: res.ok, text: res.ok ? `Sent ${res.data.rows} rows to your sheet.` : res.error });
  };

  const sendIngredients = async () => {
    setSheetBusy(true);
    setSheetMsg(null);
    const res = await sendCurrentIngredients();
    setSheetBusy(false);
    setSheetMsg({ ok: res.ok, text: res.ok ? `Synced ${res.data.rows} ingredients.` : res.error });
  };

  const box = "emp-bd mb-6 rounded-3xl border-2 p-5";

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-bold">Settings</h1>

      {/* CAFE NAME & LOGO */}
      <div className={box}>
        <h2 className="font-bold">CAFE NAME &amp; LOGO</h2>
        <p className="mb-3 text-xs opacity-70">Shown in the top bar. A square image works best.</p>
        <input className="emp-input" placeholder="Cafe name" value={cafe.name} onChange={(e) => setCafe((c) => ({ ...c, name: e.target.value }))} />

        <div className="mt-4 flex items-center gap-3">
          <div className="emp-bd grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 text-xl font-black">
            {cafe.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cafe.logo} alt="" className="h-full w-full object-contain" />
            ) : (
              (cafe.name || "W").charAt(0).toUpperCase()
            )}
          </div>
          <span className="text-xl font-bold">{cafe.name || DEFAULT_CAFE.name}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="emp-bd rounded-full border-2 px-4 py-2">
              Upload Logo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            <button type="button" onClick={() => setCafe((c) => ({ ...c, logo: null }))} className="text-sm emp-danger">
              Remove Logo
            </button>
          </div>
          <div className="flex items-center gap-3">
            {cafeMsg && <span className="text-sm">{cafeMsg}</span>}
            <button type="button" onClick={saveCafe} className="emp-bd emp-solid rounded-full border-2 px-6 py-2 font-bold">
              Save
            </button>
          </div>
        </div>
      </div>

      {/* KIOSK */}
      <div className={box}>
        <h2 className="font-bold">KIOSK MODE (THIS DEVICE ONLY)</h2>
        <p className="mb-4 text-sm">
          When on, this tablet returns to the customer ordering screen after 5 idle minutes, instead of staying on the staff screens.
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className={`emp-bd rounded-full border-2 px-4 py-2 text-sm ${kiosk ? "text-green-500" : ""}`}>
            Kiosk mode is {kiosk ? "ON" : "OFF"}
          </span>
          <button type="button" onClick={toggleKiosk} className="emp-bd rounded-full border-2 px-5 py-2 font-bold">
            {kiosk ? "Turn off kiosk mode" : "Turn on kiosk mode"}
          </button>
        </div>
      </div>

      {/* QUEUE TIMEOUT */}
      <div className={box}>
        <h2 className="font-bold">QUEUE ALERT TIME</h2>
        <p className="mb-3 text-xs opacity-70">
          Waiting orders turn red in Employee Queue after this many minutes. Orders remain first-come, first-served.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={queueTimeoutEnabled} onChange={(e) => setQueueTimeoutEnabled(e.target.checked)} />
            Enable alert
          </label>
          <label className="flex-1 text-sm">
            Minutes
            <input
              className="emp-input mt-1"
              type="number"
              min={1}
              max={1440}
              value={queueTimeout}
              onChange={(e) => setQueueTimeout(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={saveQueueTimeout} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold">
            Save
          </button>
        </div>
        {queueTimeoutMsg && <p className="mt-2 text-sm">{queueTimeoutMsg}</p>}
      </div>

      {/* SALES RESET */}
      <div className={box}>
        <h2 className="font-bold">SALES RESET SCHEDULE</h2>
        <p className="mb-3 text-xs opacity-70">
          Automatically hide completed sales on a schedule. Manual keeps them until you press Clear on the Sales page.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select className="emp-input max-w-xs" value={salesReset} onChange={(e) => saveSalesReset(e.target.value as typeof salesReset)}>
            <option value="manual">Manual only</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
            <option value="yearly">Every year</option>
          </select>
        </div>
        {salesResetMsg && <p className="mt-2 text-sm">{salesResetMsg}</p>}
      </div>

      {/* ORDER OPTIONS */}
      <div className={box}>
        <h2 className="font-bold">ORDER OPTIONS</h2>
        <p className="mb-3 text-xs opacity-70">
          Quick requests customers and staff can tap when ordering a drink, like “Less ice” or “More sugar”. They can also type their own note.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <span key={o} className="emp-bd flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm">
              {o}
              <button type="button" aria-label={`Remove ${o}`} onClick={() => saveOptions(options.filter((x) => x !== o))} className="font-bold emp-danger">
                ×
              </button>
            </span>
          ))}
          {options.length === 0 && <span className="text-sm opacity-70">No quick options yet.</span>}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="emp-input"
            placeholder="New option, e.g. Extra shot"
            maxLength={30}
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOption()}
          />
          <button type="button" onClick={addOption} className="emp-bd emp-solid shrink-0 rounded-full border-2 px-5 py-2 font-bold">
            Add
          </button>
        </div>
        {optMsg && <p className="mt-2 text-sm">{optMsg}</p>}
      </div>

      {/* BEST SELLER STAR */}
      <div className={box}>
        <h2 className="font-bold">
          BEST-SELLER STAR <span className="emp-accent">★</span>
        </h2>
        <p className="mb-3 text-xs opacity-70">
          Customers see a blue star on the most ordered drink. You can also star any drink by hand (edit the item, or use the Sales leaderboard).
        </p>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={starAuto} onChange={(e) => toggleStarAuto(e.target.checked)} />
          Automatically star the most ordered drink
        </label>
      </div>

      {/* ACCESS CODES */}
      <div className={box}>
        <h2 className="font-bold">ACCESS CODES</h2>
        <p className="mb-4 text-xs opacity-70">The admin code locks these admin screens. Leave a code off if you don’t want one.</p>
        {(["admin", "employee"] as Role[]).map((role) => (
          <div key={role} className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">{role === "admin" ? "ADMIN CODE" : "EMPLOYEE CODE"}</p>
              <p className="text-xs opacity-70">{codeSet[role] ? "Code is set" : "No code set"}</p>
            </div>
            <button type="button" onClick={() => openCode(role)} className="emp-bd rounded-full border-2 px-5 py-2 font-semibold">
              Change
            </button>
          </div>
        ))}
      </div>

      {/* GOOGLE SHEETS */}
      <div className={box}>
        <h2 className="font-bold">GOOGLE SHEETS</h2>
        <p className="mb-3 text-xs opacity-70">
          Finished orders are sent to the Sales tab automatically. Ingredient changes update matching rows in the Ingredient Stocks tab using
          the ingredient ID, so edits do not create duplicates. Set it up with the updated Apps Script in
          <span className="font-mono"> app/Admin2/_docs/GoogleSheets-AppsScript.gs</span>.
        </p>
        <div className="space-y-2">
          <input className="emp-input" placeholder="Paste URL" value={sheets.url} onChange={(e) => setSheets((s) => ({ ...s, url: e.target.value }))} />
          <input className="emp-input" placeholder="000000" value={sheets.code} onChange={(e) => setSheets((s) => ({ ...s, code: e.target.value }))} />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={sheets.auto} onChange={(e) => setSheets((s) => ({ ...s, auto: e.target.checked }))} />
          Sync sales and ingredient changes automatically
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={saveSheets} className="emp-bd rounded-full border-2 px-4 py-1.5 text-sm font-semibold">
            Save
          </button>
          <button type="button" onClick={testConnection} disabled={sheetBusy} className="emp-bd rounded-full border-2 px-4 py-1.5 text-sm font-semibold disabled:opacity-50">
            Test Connection
          </button>
          <button type="button" onClick={sendPast} disabled={sheetBusy} className="emp-bd rounded-full border-2 px-4 py-1.5 text-sm font-semibold disabled:opacity-50">
            {sheetBusy ? "Working…" : "Send all past sales"}
          </button>
          <button type="button" onClick={sendIngredients} disabled={sheetBusy} className="emp-bd rounded-full border-2 px-4 py-1.5 text-sm font-semibold disabled:opacity-50">
            {sheetBusy ? "Working…" : "Sync current ingredients"}
          </button>
        </div>
        {sheetMsg && <p className={`mt-3 text-sm ${sheetMsg.ok ? "text-green-500" : "emp-danger"}`}>{sheetMsg.text}</p>}
      </div>

      {codeRole && (
        <Modal title={`Change ${codeRole} code`} onClose={() => setCodeRole(null)}>
          <input
            autoFocus
            type="password"
            autoComplete="new-password"
            className="emp-input"
            placeholder="New code (at least 4 characters)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCode()}
          />
          {codeErr && <p className="mt-2 text-sm emp-danger">{codeErr}</p>}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setCodeRole(null)} className="emp-bd rounded-full border-2 px-5 py-2">
              Cancel
            </button>
            {codeSet[codeRole] && (
              <button type="button" onClick={() => submitCode(true)} className="text-sm underline emp-danger">
                Remove code
              </button>
            )}
            <button type="button" onClick={() => submitCode()} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold">
              Save
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
