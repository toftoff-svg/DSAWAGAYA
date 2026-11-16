'use client'

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { PaymentMethod } from '../../Admin2/_lib/menu'

export type OrderLine = {
  lineId: string
  id: number | string
  name: string
  price: number
  sugar: string | null
  notes: string | null
  qty: number
}

export type PlacedOrder = {
  orderNumber: number
  time: string
  lines: OrderLine[]
  total: number
}

type CustomerOrderState = {
  order: OrderLine[]
  setOrder: Dispatch<SetStateAction<OrderLine[]>>
  placedOrders: PlacedOrder[]
  setPlacedOrders: Dispatch<SetStateAction<PlacedOrder[]>>
  payment: PaymentMethod
  setPayment: Dispatch<SetStateAction<PaymentMethod>>
  customerName: string
  setCustomerName: Dispatch<SetStateAction<string>>
}

const CustomerOrderContext = createContext<CustomerOrderState | null>(null)

export function CustomerOrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderLine[]>([])
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([])
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [customerName, setCustomerName] = useState('')

  return (
    <CustomerOrderContext.Provider value={{ order, setOrder, placedOrders, setPlacedOrders, payment, setPayment, customerName, setCustomerName }}>
      {children}
    </CustomerOrderContext.Provider>
  )
}

export function useCustomerOrder() {
  const context = useContext(CustomerOrderContext)
  if (!context) throw new Error('useCustomerOrder must be used inside CustomerOrderProvider')
  return context
}
