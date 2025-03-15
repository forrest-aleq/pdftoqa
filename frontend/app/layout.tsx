import type React from "react"
import { AppSidebar } from "../components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { BreadcrumbNav, BreadcrumbProvider } from "@/components/breadcrumb-provider"
import { Providers } from "./providers"
import { ApiKeyModal } from "@/components/api-key-modal"

import "@/app/globals.css"

export const metadata = {
  generator: 'v0.dev'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SidebarProvider defaultOpen={false}>
            <BreadcrumbProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <BreadcrumbNav />
                  </div>
                </header>
                <div className="flex-1">{children}</div>
              </SidebarInset>
              <Toaster />
              <ApiKeyModal />
            </BreadcrumbProvider>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  )
}
