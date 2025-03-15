"use client"

import { createContext, useContext, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type BreadcrumbContextType = {
  items: {
    label: string
    href?: string
    active?: boolean
  }[]
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  items: [{ label: "Dashboard", href: "/", active: true }],
})

export const useBreadcrumb = () => useContext(BreadcrumbContext)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Generate breadcrumb items based on the current path
  let items = [{ label: "Dashboard", href: "/" }]

  if (pathname === "/") {
    items = [{ label: "Dashboard", active: true }]
  } else if (pathname === "/upload") {
    items = [
      { label: "Dashboard", href: "/" },
      { label: "Upload PDF", active: true },
    ]
  } else if (pathname.startsWith("/processing/")) {
    const pdfId = pathname.split("/")[2]
    items = [
      { label: "Dashboard", href: "/" },
      { label: "Processing", active: true },
    ]
  } else if (pathname.startsWith("/results/")) {
    const pdfId = pathname.split("/")[2]
    items = [
      { label: "Dashboard", href: "/" },
      { label: `Document ${pdfId}`, active: true },
    ]
  } else if (pathname.startsWith("/edit/")) {
    const pdfId = pathname.split("/")[2]
    items = [
      { label: "Dashboard", href: "/" },
      { label: `Document ${pdfId}`, href: `/results/${pdfId}` },
      { label: "Edit Q&A", active: true },
    ]
  }

  return <BreadcrumbContext.Provider value={{ items }}>{children}</BreadcrumbContext.Provider>
}

export function BreadcrumbNav() {
  const { items } = useBreadcrumb()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={index}>
            {index < items.length - 1 ? (
              <>
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                <BreadcrumbSeparator />
              </>
            ) : (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

