import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { RoleProvider } from '@/context/RoleContext'
import RoleSwitcher from '@/components/auth/RoleSwitcher'
import { ThemeProvider } from '@/components/ThemeProvider'

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 relative overflow-x-hidden transition-colors duration-300`}>
        {/* Modern Animated Gradient Background */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-indigo-50/50 dark:from-blue-900/20 dark:via-slate-950 dark:to-indigo-900/20 transition-colors duration-300"></div>
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[100px] z-[-1] animate-pulse pointer-events-none"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-[100px] z-[-1] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid pattern overlay for technical feel */}
        <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,black,rgba(0,0,0,0))] opacity-30 dark:opacity-10 z-[-1]"></div>
        
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RoleProvider>
            {children}
            <RoleSwitcher />
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
