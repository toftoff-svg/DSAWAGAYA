import { connection } from "next/server";
import AccessGate from "./_components/AccessGate";
import Header from "./_components/Header";
import KioskIdle from "./_components/KioskIdle";
import { OrderProvider } from "./_context/OrderContext";
import { getAccessCodesRequired, getCafe, hasCode } from "./_lib/actions";

export const instant = false;

const css = `
.emp{--bg:#F7F4EC;--fg:#0e4bbe;--overlay:rgba(255,255,255,.75);background:var(--bg);color:var(--fg)}
.emp-accent{color:var(--fg)}
.emp-bd{border-color:var(--fg)}
.emp-island{background:color-mix(in srgb,var(--fg) 7%,transparent);border:1px solid color-mix(in srgb,var(--fg) 12%,transparent);box-shadow:0 8px 24px rgba(0,0,0,.08);backdrop-filter:blur(18px)}
.emp-island-button{transition:background .15s,transform .15s}
.emp-island-button:hover{background:color-mix(in srgb,var(--fg) 10%,transparent)}
.emp-island-active{background:var(--fg);color:var(--bg);box-shadow:0 3px 10px rgba(0,0,0,.12)}
.emp-cloud-status{display:flex;align-items:center;gap:.35rem;color:var(--fg)}
.emp-cloud-status.offline{color:#dc3545}
.emp-cloud-status.checking{opacity:.55}
.emp-pixel-scene{position:relative;display:block;width:34px;height:26px;image-rendering:pixelated}
.emp-pixel-cloud{position:absolute;left:4px;top:3px;width:25px;height:12px;border-radius:8px;background:#0e4bbe;box-shadow:-4px 4px 0 -1px #0e4bbe,8px 4px 0 -1px #0e4bbe}
.emp-pixel-person{position:absolute;left:12px;top:10px;width:13px;height:8px;background:#0e4bbe;box-shadow:-4px 4px 0 -1px #0e4bbe,11px 3px 0 -1px #0e4bbe}
.emp-pixel-ground{display:none}
.emp-cloud-status.connected .emp-pixel-person{animation:emp-sleep 1.8s steps(2,end) infinite}
.emp-cloud-status.connected .emp-pixel-person::after{content:"z";position:absolute;left:13px;top:-9px;color:#0e4bbe;font-size:9px;font-weight:700;animation:emp-z 1.8s steps(2,end) infinite}
.emp-cloud-status.checking .emp-pixel-person{animation:emp-wake .45s steps(2,end) infinite}
.emp-cloud-status.offline .emp-pixel-cloud{display:none}
.emp-cloud-status.offline .emp-pixel-person{left:10px;top:12px;background:#b42318;transform:rotate(8deg);box-shadow:-4px 3px 0 -1px #b42318,12px 3px 0 -1px #b42318}
.emp-cloud-status.offline .emp-pixel-person::after{content:"!";position:absolute;left:5px;top:-10px;color:#dc3545;font-size:11px;font-weight:900}
.emp-cloud-status.offline .emp-pixel-ground{display:block;position:absolute;left:4px;bottom:2px;width:27px;height:3px;background:#9c6b4d}
@keyframes emp-sleep{0%,100%{transform:translateY(0)}50%{transform:translateY(1px)}}
@keyframes emp-z{0%,100%{opacity:0;transform:translate(0,2px)}50%{opacity:1;transform:translate(2px,-2px)}}
@keyframes emp-wake{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-8deg)}}
@media (prefers-reduced-motion:reduce){.emp-cloud-status.connected .emp-pixel-person,.emp-cloud-status.checking .emp-pixel-person,.emp-cloud-status.connected .emp-pixel-person::after{animation:none}}
.emp-solid{background:var(--fg);color:var(--bg)}
.emp-hover:hover{background:var(--fg);color:var(--bg)}
.emp-overlay{background:var(--overlay);backdrop-filter:blur(2px)}
.emp-photo{background:color-mix(in srgb,var(--fg) 8%,transparent)}
.emp-danger{color:#ef4444}
.emp-input{display:block;width:100%;background:transparent;color:var(--fg);border:2px solid var(--fg);border-radius:9999px;padding:.4rem .9rem;font-size:.9rem;outline:none}
.emp-input::placeholder{color:var(--fg);opacity:.45}
.emp-input option{background:var(--bg);color:var(--fg)}
.emp-file-input{display:none!important}
.emp input[type=checkbox]{accent-color:var(--fg)}
.emp-row{border-bottom:2px solid var(--fg)}
.emp-row-soft{border-bottom:1px solid color-mix(in srgb,var(--fg) 20%,transparent)}
`;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [cafe, lockedCode, codesRequired] = await Promise.all([getCafe(), hasCode("admin"), getAccessCodesRequired()]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="emp min-h-screen">
        <AccessGate role="admin" locked={codesRequired && lockedCode}>
          <OrderProvider>
            <KioskIdle />
            <Header cafe={cafe} />
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </OrderProvider>
        </AccessGate>
      </div>
    </>
  );
}
