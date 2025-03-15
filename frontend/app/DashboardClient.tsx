"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, FileText, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePDFList } from "@/hooks/use-pdf-api"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardClient() {
  const [searchQuery, setSearchQuery] = useState("")
  
  // Fetch PDF list from API
  const { 
    data: pdfs = [], 
    isLoading, 
    isError, 
    error 
  } = usePDFList()

  // Filter PDFs based on search query
  const filteredPDFs = pdfs.filter(pdf => 
    pdf.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate dashboard stats from real data
  const totalDocuments = pdfs.length
  const totalQuestions = pdfs.reduce((acc, pdf) => acc + pdf.qa_count, 0)
  
  // Format status from API to display format
  const getStatusDisplay = (status: string) => {
    if (status === "completed") return "Completed"
    if (status === "processing" || status.startsWith("processing_")) return "Processing"
    if (status === "uploaded") return "Queued"
    if (status === "failed") return "Failed"
    return status
  }

  // Get status color class
  const getStatusColorClass = (status: string) => {
    if (status === "completed") return "bg-green-500"
    if (status === "processing" || status.startsWith("processing_")) return "bg-yellow-500"
    if (status === "uploaded") return "bg-blue-500"
    return "bg-red-500"
  }

  // Format date string
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[80px] mb-1" />
                <Skeleton className="h-3 w-[140px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <Skeleton className="h-6 w-[180px]" />
              <Skeleton className="h-4 w-[220px] mt-1" />
            </div>
            <Skeleton className="h-9 w-[250px]" />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="py-3">
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">Error Loading Data</h2>
          <p className="text-muted-foreground mt-2">
            {error?.message || "Failed to load your documents. Please try again later."}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (pdfs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">No Documents Yet</h2>
          <p className="text-muted-foreground mt-2">
            Upload your first PDF to get started with Q&A generation
          </p>
          <Link href="/upload">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Upload PDF
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">From your PDF library</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Generated</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">Total Q&A pairs generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Documents</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pdfs.filter(doc => doc.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((pdfs.filter(doc => doc.status === "completed").length / totalDocuments) * 100)}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Q&A Count</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalDocuments ? Math.round(totalQuestions / totalDocuments) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Questions per document</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>
                You have processed {pdfs.length} document{pdfs.length !== 1 ? 's' : ''} in total.
              </CardDescription>
            </div>
            <Input 
              placeholder="Search documents..." 
              className="w-[250px]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardHeader>
          <CardContent>
            {filteredPDFs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPDFs.map((pdf) => (
                      <TableRow key={pdf.id}>
                        <TableCell className="font-medium">{pdf.original_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div
                              className={`mr-2 h-2 w-2 rounded-full ${getStatusColorClass(pdf.status)}`}
                            />
                            {getStatusDisplay(pdf.status)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(pdf.created_at)}</TableCell>
                        <TableCell>{pdf.qa_count}</TableCell>
                        <TableCell>{pdf.page_count || '-'}</TableCell>
                        <TableCell className="text-right">
                          {pdf.status === "completed" ? (
                            <Link href={`/results/${pdf.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                                <ArrowUpRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                          ) : pdf.status === "processing" || pdf.status.startsWith("processing_") ? (
                            <Link href={`/processing/${pdf.id}`}>
                              <Button variant="ghost" size="sm">
                                Check Progress
                                <ArrowUpRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                          ) : pdf.status === "uploaded" ? (
                            <Link href={`/processing/${pdf.id}`}>
                              <Button variant="ghost" size="sm">
                                View Status
                                <ArrowUpRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="ghost" size="sm">
                              Retry
                              <Upload className="ml-1 h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border">
                <div className="text-center">
                  <p className="mb-2 text-muted-foreground">No documents found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Document</CardTitle>
              <CardDescription>
                Upload a PDF to generate Q&A pairs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-4 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop or click to upload
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/upload" className="w-full">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  New PDF
                </Button>
              </Link>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest processing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pdfs.slice(0, 3).map((pdf) => (
                  <div key={pdf.id} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColorClass(pdf.status)}`} />
                    <div className="flex-1 overflow-hidden text-sm">
                      <p className="truncate max-w-full font-medium" title={pdf.original_name}>
                        {pdf.original_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getStatusDisplay(pdf.status)} • {formatDate(pdf.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {pdfs.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    No recent activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
