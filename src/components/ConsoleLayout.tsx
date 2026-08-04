import { type ReactNode } from 'react'
import { Header } from './Header'
import './console-layout.css'

export interface ConsoleLayoutProps {
  children: ReactNode
}

export function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return (
    <div className="console-layout">
      <Header />
      <main className="console-main-content">{children}</main>
    </div>
  )
}
