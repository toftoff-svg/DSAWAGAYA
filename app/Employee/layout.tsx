import { connection } from "next/server";
import Header from "./_components/Header";
import { OrderProvider } from "./_context/OrderContext";
import AccessGate from "../Admin2/_components/AccessGate";
import { getCafe, hasCode } from "../Admin2/_lib/actions";

export const instant = false;

const css = `
.emp{--bg:#F7F4EC;--fg:#263B32;--muted:#4C6B54;--line:#B7C2A5;--accent:#164734;--accent-text:#FCFAF4;--accent-soft:#F0F4EA;--overlay:rgba(21,61,40,.45);background:var(--bg);color:var(--fg)}
.emp-bd{border-color:var(--line)}
.emp-solid{background:var(--accent);color:var(--accent-text)}
.emp-hover:hover{background:var(--accent-soft);color:var(--fg)}
.emp-overlay{background:var(--overlay);backdrop-filter:blur(4px)}
.emp-photo{border-color:var(--line);background:#FCFAF4}
.emp-input{display:block;width:100%;background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:.85rem;padding:.6rem .85rem;font-size:.9rem;outline:none}
.emp-input::placeholder{color:var(--muted)}
.emp-input option{background:var(--bg);color:var(--fg)}
`;

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [cafe, locked] = await Promise.all([getCafe(), hasCode("employee")]);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="emp min-h-screen">
        <AccessGate role="employee" locked={locked}>
          <OrderProvider>
            <Header cafe={cafe} />
            <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">{children}</main>
          </OrderProvider>
        </AccessGate>
      </div>
    </>
  );
}
