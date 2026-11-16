import Header from "./_components/Header";
import { OrderProvider } from "./_context/OrderContext";
import AccessGate from "../../Admin2/_components/AccessGate";
import { getAccessCodesRequired, getCafe, hasCode } from "../../Admin2/_lib/actions";

const css = `
.emp{--bg:#f4f6fa;--fg:#1f2937;--muted:#718096;--line:#e4e8f0;--accent:#17191b;--accent-text:#ffffff;--accent-soft:#e1e3e7;--overlay:rgba(15,23,42,.38);background:var(--bg);color:var(--fg)}
.emp-bd{border-color:var(--line)}
.emp-solid{background:var(--accent);color:var(--accent-text)}
.emp-hover:hover{background:var(--accent-soft);color:var(--fg)}
.emp-overlay{background:var(--overlay);backdrop-filter:blur(4px)}
.emp-photo{background:color-mix(in srgb,var(--fg) 8%,transparent)}
.emp-input{display:block;width:100%;background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:.85rem;padding:.6rem .85rem;font-size:.9rem;outline:none}
`;

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [cafe, lockedCode, codesRequired] = await Promise.all([getCafe(), hasCode("employee"), getAccessCodesRequired()]);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="emp min-h-screen">
        <AccessGate role="employee" locked={codesRequired && lockedCode}>
          <OrderProvider>
            <Header cafe={cafe} />
            <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">{children}</main>
          </OrderProvider>
        </AccessGate>
      </div>
    </>
  );
}
