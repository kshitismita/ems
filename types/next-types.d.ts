// Next.js type definitions to prevent validator errors
import type { ReactNode } from 'react'

declare global {
  namespace Next {
    interface LayoutProps<Route = string> {
      children: ReactNode
      params?: Promise<any>
    }
  }
}

export {}
