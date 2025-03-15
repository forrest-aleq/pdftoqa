"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { usePDFUpload } from "@/hooks/use-pdf-api"
import { useToast } from "@/hooks/use-toast"

export default function UploadPageClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Use our PDF upload mutation hook
  const { mutate: uploadPDF, isPending, isError, error: uploadError } = usePDFUpload()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please upload a valid PDF file")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Please upload a valid PDF file")
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
  }

  const handleUpload = () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    // Show progress animation while waiting for upload to complete
    // This maintains the UX of seeing progress while the actual upload happens
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        // Only go to 95% with the animation, the real completion will push to 100%
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + 5
      })
    }, 200)

    // Call the actual API to upload the PDF
    uploadPDF(file, {
      onSuccess: (data) => {
        clearInterval(interval)
        setUploadProgress(100)
        
        // Show success message
        toast({
          title: "Upload successful",
          description: "Your PDF has been uploaded and is now being processed.",
        })
        
        // Redirect to the processing page with the real PDF ID
        setTimeout(() => {
          router.push(`/processing/${data.id}`)
        }, 500)
      },
      onError: (error) => {
        clearInterval(interval)
        setIsUploading(false)
        setUploadProgress(0)
        
        // Show error toast
        toast({
          title: "Upload failed",
          description: error.message || "There was an error uploading your PDF. Please try again.",
          variant: "destructive",
        })
      }
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Upload PDF Document</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload a PDF document to generate Q&A pairs. We support documents up to 50MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">Drag & Drop your PDF here</h3>
                <p className="mb-4 text-sm text-muted-foreground">or click to browse files</p>
                <Input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileChange} 
                  className="sr-only" 
                  id="file-upload" 
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Browse Files
                </Button>
                {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
              </>
            ) : (
              <div className="w-full">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemoveFile} disabled={isUploading}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 w-full" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-2 font-medium">Document Requirements</h3>
            <ul className="ml-6 list-disc text-sm text-muted-foreground">
              <li>File must be in PDF format</li>
              <li>Maximum file size: 50MB</li>
              <li>Text must be selectable (not scanned images)</li>
              <li>For best results, use documents with clear headings and structure</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading || isPending}>
            {isUploading ? "Uploading..." : "Process Document"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
