import { type ReactNode } from 'react'
import { Header } from './Header'

export interface ConsoleLayoutProps {
  children: ReactNode
}

/** Everything shares one 1280px measure: the top bar's inner content, the page,
 *  and every card footer align to the same edge. */
export function ConsoleLayout({ children }: ConsoleLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <Header />
      <main className="mx-auto w-full max-w-[1280px] grow px-4 pt-6 pb-10 md:px-6 md:pt-8 md:pb-12">
        {children}
      </main>
    </div>
  )
}
