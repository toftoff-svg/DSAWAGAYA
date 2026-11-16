import type { ReactNode } from 'react'
import { CustomerOrderProvider } from './_context/OrderContext'
import OrderTheme from '../_components/OrderTheme'

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <OrderTheme>
      <CustomerOrderProvider>{children}</CustomerOrderProvider>
    </OrderTheme>
  )
}
