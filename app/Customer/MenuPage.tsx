import { connection } from 'next/server'
import Image from 'next/image'
import { getCustomerExtras } from './actions'
import MenuList from './MenuList'
import HomeReturnButton from '../_components/HomeReturnButton'
import BrandName from '../_components/BrandName'
import { getCafe, getMenu } from '../Admin2/_lib/actions'

type MenuSection = 'drinks' | 'pastries'

export default async function MenuPage({ section }: { section: MenuSection }) {
  await connection()

  const [menuResult, { options, starIds }, cafe] = await Promise.all([
    getMenu(),
    getCustomerExtras(),
    getCafe(),
  ])

  if (!menuResult.ok) {
    return (
      <main className="min-h-screen bg-[#F7F4EC] p-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-white p-5 text-red-800">
          <p className="font-semibold">Error connecting to your menu database</p>
          <p className="mt-1 font-mono text-xs text-red-600">
            {menuResult.error}
          </p>
        </div>
      </main>
    )
  }

  const items = menuResult.data
    .filter((item) => item.category === section)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      ...item,
      star: starIds.includes(String(item.id)),
    }))

  return (
    <main className="min-h-screen bg-[#F7F4EC] text-[#263B32]">
      <header className="emp-bd border-b border-[#C9B68F] bg-[#F7F4EC]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="brand-name emp-photo grid h-11 w-11 place-items-center overflow-hidden rounded-full border text-xl text-[#164734]">
              {cafe.logo ? (
                <Image src={cafe.logo} alt="" width={44} height={44} unoptimized className="h-full w-full object-contain" />
              ) : (
                cafe.name.charAt(0).toUpperCase()
              )}
            </div>
            <BrandName name={cafe.name} className="text-[1.375rem] text-[#164734]" />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#B7C2A5] bg-[#FCFAF4] px-4 py-2 text-xs font-medium text-[#263B32] sm:inline">
              Items Available: {items.length}
            </span>
            <HomeReturnButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <MenuList items={items} options={options} section={section} />
      </div>
    </main>
  )
}
