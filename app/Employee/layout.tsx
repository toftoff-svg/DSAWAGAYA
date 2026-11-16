import { connection } from "next/server";
import Header from "./_components/Header";
import { OrderProvider } from "./_context/OrderContext";
import AccessGate from "../Admin2/_components/AccessGate";
import { getAccessCodesRequired, getCafe, hasCode } from "../Admin2/_lib/actions";
import OrderTheme from "../_components/OrderTheme";

export const instant = false;

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [cafe, lockedCode, codesRequired] = await Promise.all([getCafe(), hasCode("employee"), getAccessCodesRequired()]);
  return (
    <OrderTheme>
      <AccessGate role="employee" locked={codesRequired && lockedCode}>
        <OrderProvider>
          <Header cafe={cafe} />
          <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">{children}</main>
        </OrderProvider>
      </AccessGate>
    </OrderTheme>
  );
}
