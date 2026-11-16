import type { ReactNode } from "react";

const css = `
.emp{--bg:#F7F4EC;--fg:#0e4bbe;--muted:#0e4bbe;--line:#0e4bbe;--accent:#0e4bbe;--accent-text:#FCFAF4;--accent-soft:#0e4bbe;--overlay:rgba(14,75,190,.45);background:var(--bg);color:var(--fg)}
.emp-bd{border-color:var(--line)}
.emp-solid{background:var(--accent);color:var(--accent-text)}
.emp-hover:hover{background:var(--accent-soft);color:var(--fg)}
.emp-overlay{background:var(--overlay);backdrop-filter:blur(2px)}
.emp-photo{border-color:var(--line);background:#FCFAF4}
.emp-input{display:block;width:100%;background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:.85rem;padding:.6rem .85rem;font-size:.9rem;outline:none}
.emp-input::placeholder{color:var(--muted)}
.emp-input option{background:var(--bg);color:var(--fg)}
`;

export default function OrderTheme({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="emp min-h-screen">{children}</div>
    </>
  );
}
