"use client"

import { useState } from "react"
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalQuestions: number
}

export function ExportModal({ open, onOpenChange, totalQuestions }: ExportModalProps) {
  const [format, setFormat] = useState("json")
  const [scope, setScope] = useState("all")
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeSourceRefs, setIncludeSourceRefs] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false)
      onOpenChange(false)

      toast({
        title: "Export complete",
        description: `Successfully exported ${totalQuestions} Q&A pairs as ${format.toUpperCase()}.`,
      })
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Q&A Pairs</DialogTitle>
          <DialogDescription>Choose your export format and options.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="json" id="json" className="peer sr-only" />
                <Label
                  htmlFor="json"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <FileJson className="mb-3 h-6 w-6" />
                  JSON
                </Label>
              </div>

              <div>
                <RadioGroupItem value="csv" id="csv" className="peer sr-only" />
                <Label
                  htmlFor="csv"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <FileSpreadsheet className="mb-3 h-6 w-6" />
                  CSV
                </Label>
              </div>

              <div>
                <RadioGroupItem value="txt" id="txt" className="peer sr-only" />
                <Label
                  htmlFor="txt"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <FileText className="mb-3 h-6 w-6" />
                  TXT
                </Label>
              </div>

              <div>
                <RadioGroupItem value="docx" id="docx" className="peer sr-only" />
                <Label
                  htmlFor="docx"
                  className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <FileText className="mb-3 h-6 w-6" />
                  DOCX
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Export Scope</Label>
            <RadioGroup value={scope} onValueChange={setScope} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All Q&A pairs ({totalQuestions})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected">Selected pairs only (0)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered">Current filtered view ({totalQuestions})</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Additional Options</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-metadata" className="cursor-pointer">
                  Include metadata (page numbers, sections)
                </Label>
                <Switch id="include-metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="include-source-refs" className="cursor-pointer">
                  Include source references
                </Label>
                <Switch id="include-source-refs" checked={includeSourceRefs} onCheckedChange={setIncludeSourceRefs} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

