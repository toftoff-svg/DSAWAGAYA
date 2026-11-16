import Link from 'next/link';
import Image from 'next/image';
import { getCafe } from './Admin2/_lib/actions';
import ClearStaffAccess from './_components/ClearStaffAccess';

export const instant = false;

export default async function Home() {
  const cafe = await getCafe();
  const roles: { href: string; label: string; description?: string }[] = [
    { href: "/Customer", label: "Customer" },
    { href: "/Employee", label: "Employee" },
    { href: "/Admin2", label: "Admin" },
  ];

  return (
    <>
  <ClearStaffAccess />

  <main className="relative min-h-screen overflow-hidden bg-[#F7F4EC] text-[#0e4bbe]">
    {/* kulay and design ng background  */}
    <header className="relative z-10 border-b border-[#B99A55] bg-[#FAF7EF]/80 px-5 py-4 sm:px-8">
    {/* yung parang gold accent */} 
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[#2D63B8] bg-[#FCFAF4] text-xl font-bold text-[#164734]">
          {cafe.logo ? (
            <Image src={cafe.logo} alt="" width={44} height={44} unoptimized className="h-full w-full object-contain" />
          ) : (
            cafe.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-xl font-bold tracking-tight text-[#164734]">
          {cafe.name}
        </span>
      </div>
    </header>
    <section className="relative z-10 flex min-h-[calc(100vh-91px)] items-center justify-center px-5 py-14 sm:px-8">
      <div className="w-full max-w:1120px text-center">
        <div className="mx-auto mb-7 h-[3px] w-[120px] bg-[#B99A55]" />
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.42em] text-[#0e4bbe] sm:text-[10px]">
          Point of Sale
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em] text-[#0e4bbe] sm:text-4xl lg:text-[60px]">
          Welcome to {cafe.name} {/* welcome to WAGAYA*/}
        </h1>
        <p className="mx-auto mt-5 text-lg font-normal text-[#0e4bbe] sm:text-[12px] sm:leading-tight">
          Choose how you’re using this device.
        </p>
        <div className="mx-auto mt-9 grid max-w-190 grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-10">
          {/* para sa box width */}

          {roles.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h:220px flex-col rounded:16px border-2 border-[#2D63B8] bg-[#FFFCF5]/75 p-4 text-left shadow-[0_6px_15px_rgba(31,51,34,0.08)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:border-[#0e4bbe] hover:shadow-[0_14px_25px_rgba(31,51,34,0.13)] sm:p-5"
            >
              <span className="inline-flex h-10 w-10 min-h-10 min-w-10 max-h-10 max-w-10 shrink-0 self-start items-center justify-center rounded-full bg-[#0e4bbe] text-xl font-bold text-[#FFFDF6]">
              {label.charAt(0)}
            {/* bilog e, c, a*/}
              </span>
              <span className="mt-4 block text-[20px] font-bold leading-tight tracking-tight text-[#153D2E] sm:text-[26px]">
                {label}
              </span>
              <span className="mt-2 block text-[10px] leading-snug text-[#4C6B54] sm:text-[10px]">
                {description}
              </span>
              <span className="mt-5 flex min-h: 8px w-full items-center justify-center gap-2 rounded-full border border-[#2D63B8] bg-[#0e4bbe] px-4 text-[12px] font-medium text-white shadow-sm transition-colors duration-300 hover:bg-[#0e4bbe] sm:mt-auto sm:translate-y-0 sm:text-[15px]">
                Open <span className="text-xl leading-none">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </main>
</>
  );
}
