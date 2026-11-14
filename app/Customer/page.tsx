
import { connection } from 'next/server'
import { getCustomerExtras } from './actions'
import MenuList from './MenuList'
import HomeReturnButton from '../_components/HomeReturnButton'
import { getCafe, getMenu } from '../Admin2/_lib/actions'

export const instant = false

export default async function MenuDashboard() {
  await connection()

  const menuResult = await getMenu()

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

  const menuItems = menuResult.data

  const { options, starIds } = await getCustomerExtras()
  const cafe = await getCafe()

  const items = menuItems
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({
      ...m,
      star: starIds.includes(String(m.id))
    }))

  return (
    <main className="min-h-screen bg-[#F7F4EC] text-[#263B32]">

      {/* HEADER */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#C9B68F] bg-[#F7F4EC]/95 px-5 py-4 shadow-sm backdrop-blur-md sm:px-8">

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[#B7C2A5] bg-[#FCFAF4] text-xl font-bold text-[#164734]">
            {cafe.logo ? (
              <img
                src={cafe.logo}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              cafe.name.charAt(0).toUpperCase()
            )}
          </div>

          <span className="text-xl font-bold tracking-tight text-[#164734]">
            {cafe.name}
          </span>
        </div>

        <div className="flex items-center gap-3">

          <span className="hidden rounded-full border border-[#B7C2A5] bg-[#FCFAF4] px-4 py-2 text-xs font-medium text-[#263B32] sm:inline">
            Items Available: {menuItems.length}
          </span>

          <HomeReturnButton />

        </div>
      </header>

      {/* MENU CONTENT */}
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">

        <MenuList items={items} options={options} />

      </div>

    </main>
  )
}
