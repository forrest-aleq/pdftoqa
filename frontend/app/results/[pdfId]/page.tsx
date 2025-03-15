"use client"

import React, { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Copy, Download, Edit, FileText, Search, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExportModal } from "@/components/export-modal"
import { useQAPairs, usePDF } from "@/hooks/use-pdf-api"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { QAPair } from "@/lib/services/pdf-service"

// Content component to handle all the functionality
function ResultsContent({ pdfId }: { pdfId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedQA, setSelectedQA] = useState<string | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Fetch the PDF and QA pairs from the API
  const { 
    data: pdfData, 
    isLoading: isPdfLoading, 
    isError: isPdfError,
    error: pdfError 
  } = usePDF(pdfId)
  
  const { 
    data: qaPairsData, 
    isLoading: isQaPairsLoading, 
    isError: isQaPairsError,
    error: qaPairsError 
  } = useQAPairs(pdfId)

  // Show error toast if there's an error fetching data
  if (isPdfError && pdfError) {
    toast({
      title: "Error loading document",
      description: pdfError.message || "Failed to load document details",
      variant: "destructive",
    })
  }

  if (isQaPairsError && qaPairsError) {
    toast({
      title: "Error loading Q&A pairs",
      description: qaPairsError.message || "Failed to load Q&A pairs",
      variant: "destructive",
    })
  }

  // Select the first QA pair by default when data loads
  if (qaPairsData && qaPairsData.length > 0 && !selectedQA) {
    if (qaPairsData[0]?.id) {
      setSelectedQA(qaPairsData[0].id)
    }
  }

  // Get unique sections for filtering from the real data
  const sections = qaPairsData 
    ? Array.from(new Set(qaPairsData.map((qa) => qa.section).filter(Boolean) as string[]))
    : []

  // Filter Q&A pairs based on search and section filter
  const filteredQAPairs = qaPairsData 
    ? qaPairsData.filter((qa) => {
        const matchesSearch =
          searchQuery === "" ||
          qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          qa.answer.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesSection = selectedSection === null || qa.section === selectedSection

        return matchesSearch && matchesSection
      })
    : []

  // Function to handle copy button click
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Answer copied to clipboard successfully",
    })
  }

  // Loading view
  if (isPdfLoading || isQaPairsLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-end border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
          {/* Document Preview Panel - Loading */}
          <div className="border-r">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
              <h2 className="font-medium">Document Preview</h2>
              <Skeleton className="h-9 w-[200px]" />
            </div>
            <div className="p-4">
              <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-lg" />
            </div>
          </div>

          {/* Q&A Panel - Loading */}
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 border-b bg-background p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <h2 className="mb-4 text-lg font-medium">Loading Q&A Pairs...</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/edit/${pdfId}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Q&A
          </Button>
          <Button size="sm" onClick={() => setIsExportModalOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
        {/* Document Preview Panel */}
        <div className="border-r">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
            <h2 className="font-medium">Document Preview</h2>
            <Tabs defaultValue="preview">
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="outline">Outline</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="p-4">
            <TabsContent value="preview" className="mt-0">
              <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">Document Preview</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  This is where the PDF preview would be displayed. In a real application, this would show the actual
                  document with highlighted sections corresponding to the selected Q&A pair.
                </p>
                {pdfData && (
                  <p className="text-sm text-primary">
                    {pdfData.original_name || pdfData.filename}
                  </p>
                )}
                {selectedQA && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Currently viewing Q&A ID: {selectedQA}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="outline" className="mt-0">
              <div className="rounded-lg border p-4">
                <h3 className="mb-4 font-medium">Document Outline</h3>
                {sections.length > 0 ? (
                  <ul className="space-y-2">
                    {sections.map((section, index) => (
                      <li key={index}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left"
                          onClick={() => setSelectedSection(section)}
                        >
                          {section}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No sections available for this document.
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </div>

        {/* Q&A Panel */}
        <div className="flex flex-col">
          <div className="sticky top-0 z-10 border-b bg-background p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions and answers..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedSection(null)}>All Sections</DropdownMenuItem>
                  {sections.length > 0 && <Separator className="my-1" />}
                  {sections.map((section, index) => (
                    <DropdownMenuItem key={index} onClick={() => setSelectedSection(section)}>
                      {section}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {selectedSection && (
              <div className="mt-2 flex items-center">
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  {selectedSection}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-4 w-4 p-0"
                    onClick={() => setSelectedSection(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            <h2 className="mb-4 text-lg font-medium">
              Generated Q&A Pairs ({filteredQAPairs.length})
            </h2>

            <div className="space-y-4">
              {filteredQAPairs.length > 0 ? (
                filteredQAPairs.map((qa) => (
                  <Collapsible
                    key={qa.id}
                    defaultOpen={qa.id === selectedQA}
                    open={qa.id === selectedQA}
                    onOpenChange={(open) => {
                      if (open) setSelectedQA(qa.id)
                    }}
                  >
                    <Card className={`overflow-hidden ${qa.id === selectedQA ? "border-primary" : ""}`}>
                      <CollapsibleTrigger asChild>
                        <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50">
                          <div className="flex-1">
                            <h3 className="font-medium">{qa.question}</h3>
                            <div className="mt-1 flex items-center text-xs text-muted-foreground">
                              {qa.page_number && <span className="mr-2">Page {qa.page_number}</span>}
                              {qa.page_number && <span className="mr-2">•</span>}
                              {qa.section && <span>{qa.section}</span>}
                              {qa.section && <span className="mr-2 ml-2">•</span>}
                              {qa.confidence && (
                                <span>Confidence: {(qa.confidence * 100).toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Separator />
                        <CardContent className="p-4 pt-4">
                          <p>{qa.answer}</p>
                          <div className="mt-4 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCopy(qa.answer)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <Search className="mb-2 h-8 w-8 text-muted-foreground" />
                  <h3 className="font-medium">No results found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ExportModal 
        open={isExportModalOpen} 
        onOpenChange={setIsExportModalOpen} 
        totalQuestions={qaPairsData?.length || 0} 
      />
    </div>
  )
}

// Main page component
export default function ResultsPage({ params }: { params: { pdfId: string } }) {
  // Properly unwrap params using React.use to avoid the warning
  const unwrappedParams = use(params as any) as { pdfId: string };
  
  // Forward the pdfId directly as a string prop to the content component
  return <ResultsContent pdfId={unwrappedParams.pdfId} />
}
