import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RoleProvider } from '@/context/RoleContext'
import RoleSwitcher from '@/components/auth/RoleSwitcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ApparelFlow ERP Execution System',
  description: 'Production Batch Verification & Sewing Queue Gate',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 min-h-screen text-gray-900 bg-[url('/grid.svg')] relative`}>
        <div className="absolute inset-0 bg-blue-50/40 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] -z-10"></div>
        <RoleProvider>
          {children}
          <RoleSwitcher />
        </RoleProvider>
      </body>
    </html>
  )
}
