import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import Layout from '@/components/Layout'

export type RootOutletCtx = { setHeaderRight: (n: ReactNode) => void }

export default function RootLayout() {
  const [headerRight, setHeaderRight] = useState<ReactNode>(null)
  const ctx: RootOutletCtx = { setHeaderRight }
  return (
    <Layout headerRight={headerRight}>
      <Outlet context={ctx} />
    </Layout>
  )
}
