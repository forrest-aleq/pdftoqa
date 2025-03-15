// Add "use client" directive to the content component only
"use client"

import React, { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, FileText, Loader2, XCircle, Clock, AlertCircle, RefreshCw, FileDigit, Calendar, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { usePDFStatus, usePDF, useCancelPDFProcessing } from "@/hooks/use-pdf-api"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// Create a wrapper component that safely handles params
function ProcessingContent({ pdfId }: { pdfId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState("Initializing")
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState("Calculating...")
  const [startTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [documentName, setDocumentName] = useState("Document.pdf")

  // Add state for connection status tracking
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [isConnectionStalled, setIsConnectionStalled] = useState(false)
  const [isServiceStarting, setIsServiceStarting] = useState(true)

  // Get PDF processing status from the API
  const { 
    data: statusData, 
    isError: statusError, 
    error: statusErrorData, 
    isLoading: apiIsLoading,
    refetch: refetchStatus,
    isFetching,
    failureCount,
    failureReason
  } = usePDFStatus(pdfId)

  // Get PDF details to show the name
  const { data: pdfData } = usePDF(pdfId)

  // Get mutation for canceling processing
  const { mutate: cancelProcessing, isPending: isCanceling } = useCancelPDFProcessing()

  // Connection stall detection - if no response for 10 seconds
  useEffect(() => {
    // Only check for stalled connection if we're still loading
    if (isFetching && !statusData) {
      const stallTimer = setTimeout(() => {
        setIsConnectionStalled(true);
        setConnectionAttempts(prev => prev + 1);
        
        // Show a toast about connection issues
        toast({
          title: "Connection issue detected",
          description: "We're having trouble connecting to the server. The service might be starting up.",
          variant: "destructive"
        });
        
        // Try to refetch
        refetchStatus();
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(stallTimer);
    }
    
    // Reset connection stalled state if we get data
    if (statusData) {
      setIsConnectionStalled(false);
      setIsServiceStarting(false);
    }
  }, [isFetching, statusData, refetchStatus, toast]);

  // Service starting state - after 3 failed attempts, provide more info
  useEffect(() => {
    if (failureCount > 3 && isServiceStarting) {
      toast({
        title: "Service may be starting up",
        description: "The backend service appears to be starting up. This might take up to a minute.",
        duration: 5000
      });
    }
  }, [failureCount, isServiceStarting, toast]);

  // Update loading state
  useEffect(() => {
    setIsLoading(apiIsLoading)
  }, [apiIsLoading])

  // Update document name when data is available
  useEffect(() => {
    if (pdfData?.original_name) {
      setDocumentName(pdfData.original_name)
    }
  }, [pdfData])

  // Map backend status to frontend stages and progress
  useEffect(() => {
    if (statusData) {
      // Use the actual progress value from the backend if available
      if (statusData.progress !== undefined && statusData.progress !== null) {
        setProgress(statusData.progress);
      }
      
      // Map the backend status to frontend UI states
      switch (statusData.status) {
        case 'uploaded':
          setCurrentStage("Waiting to Process")
          setTimeRemaining("Waiting to start...")
          break
        case 'processing':
          setCurrentStage("Text Extraction")
          setTimeRemaining("Approximately 2 minutes")
          break
        case 'completed':
          setCurrentStage("Complete")
          setIsComplete(true)
          setTimeRemaining("Done")
          break
        case 'failed':
          setCurrentStage("Error")
          setError(statusData.message || "Unknown error occurred during processing")
          setTimeRemaining("N/A")
          break
        case 'canceled':
          setCurrentStage("Canceled")
          setError("Processing was canceled by the user")
          setTimeRemaining("N/A")
          break
        default:
          // Handle both processing_chunk_X_of_Y and analyzing_chunk_X_of_Y formats
          if (statusData.status.startsWith('processing_chunk') || statusData.status.startsWith('analyzing_chunk')) {
            const parts = statusData.status.split('_');
            if (parts.length >= 5) {
              try {
                const current = parseInt(parts[2]);
                const total = parseInt(parts[4]);
                
                setCurrentStage(`Processing Chunk ${current}/${total}`)
                setTimeRemaining("Processing...")
              } catch (e) {
                // Fallback if parsing fails
                setCurrentStage("Processing")
                setTimeRemaining("Calculating...")
              }
            } else {
              setCurrentStage("Processing")
              setTimeRemaining("Calculating...")
            }
          } else {
            // Unknown status
            setCurrentStage(`Processing: ${statusData.status}`)
            setProgress(statusData.progress || 10)
            setTimeRemaining("Calculating...")
          }
      }
    }
  }, [statusData])

  // Handle status error
  useEffect(() => {
    if (statusError) {
      setError(`Failed to get processing status: ${statusErrorData?.message || "Unknown error"}`)
    }
  }, [statusError, statusErrorData])

  // Refresh view function
  const refreshView = () => {
    setError(null)
    setCurrentStage("Restarting")
    setProgress(0)
    router.refresh()
  }

  // Navigation function
  const handleViewResults = () => {
    router.push(`/results/${pdfId}`)
  }

  // Function to handle restart
  const handleRestart = () => {
    if (confirm("Are you sure you want to restart processing? This will begin from the start again.")) {
      // Implement restart functionality here - for now just refresh the page
      refreshView();
    }
  }

  // Function to handle cancel
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel processing? This action cannot be undone.")) {
      // Show feedback immediately
      toast({
        title: "Attempting to cancel...",
        description: "Sending cancel request to the server.",
      });
      
      // Call the cancel mutation
      cancelProcessing(pdfId, {
        onSuccess: (data) => {
          toast({
            title: "Processing canceled",
            description: "The PDF processing has been canceled successfully."
          });
          
          // Force a refetch of the status to update the UI immediately
          refetchStatus();
        },
        onError: (error: any) => {
          // Check if the error is because the server is still starting up
          if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('Network Error')) {
            toast({
              variant: "destructive",
              title: "Server unavailable",
              description: "The processing server seems to be starting up. Your cancel request will be processed once the server is available."
            });
            
            // Try to refetch status in case the server just became available
            setTimeout(() => {
              refetchStatus();
            }, 2000);
          } else {
            toast({
              variant: "destructive",
              title: "Error canceling processing",
              description: "There was an error canceling the PDF processing. Please try again."
            });
          }
          console.error("Error canceling processing:", error);
        }
      });
    }
  }

  // Convert milliseconds to minutes and seconds
  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Calculate time elapsed
  const timeElapsed = new Date().getTime() - startTime.getTime()

  return (
    <div className="container items-center justify-center max-w-4xl mx-auto py-10">
      <div className="flex flex-col items-center justify-center w-full">
        
        <Card className="w-full max-w-3xl mx-auto relative overflow-hidden border-0 shadow-lg rounded-xl bg-white">
          {!isComplete && !error && (
            <button 
              className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors z-10"
              title="Return to Dashboard"
              onClick={handleCancel}
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
          
          {isComplete ? (
            <div className="p-10 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-gray-100 p-5 mb-6">
                  <CheckCircle className="h-14 w-14 text-gray-700" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3">Processing Complete</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">Your document <span className="font-medium text-gray-700">{documentName}</span> has been successfully processed.</p>
              
              <Button size="lg" className="px-10 py-6 rounded-xl text-base bg-gray-800 hover:bg-gray-700" onClick={handleViewResults}>
                View Results
              </Button>
            </div>
          ) : error ? (
            <div className="p-10">
              <div className="flex justify-center mb-8">
                <div className="rounded-full bg-red-50 p-5">
                  <AlertCircle className="h-14 w-14 text-red-500" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-center mb-4">Processing Error</h2>
              <p className="text-gray-500 text-center mb-6">We encountered an issue while processing <span className="font-medium text-gray-700">{documentName}</span></p>
              
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              
              <div className="p-5 bg-gray-50 rounded-xl mb-8">
                <h3 className="font-medium mb-3">Troubleshooting Tips:</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Check if your PDF file is password protected</li>
                  <li>Ensure the PDF contains readable text (not scanned images)</li>
                  <li>Verify the file size is under the allowed limit</li>
                  <li>Make sure the document isn't corrupted</li>
                </ul>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  className="rounded-xl px-6 py-5 bg-gray-800 hover:bg-gray-700" 
                  onClick={refreshView}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Linear progress indicator at top */}
              {progress > 0 && progress < 100 && (
                <div className="h-1.5 w-full bg-gray-100">
                  <div 
                    className="h-full bg-gray-500 transition-all duration-500 ease-in-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              
              <div className="px-8 py-7">
                {/* Connection status alerts */}
                {isConnectionStalled && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Issue</AlertTitle>
                    <AlertDescription>
                      We're having trouble connecting to the processing service. 
                      {connectionAttempts > 2 ? (
                        <span> The backend service might be starting up, which can take up to a minute. Please wait.</span>
                      ) : (
                        <span> Retrying automatically...</span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {failureCount > 0 && !isConnectionStalled && (
                  <Alert className="mb-4">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertTitle>Connecting to service</AlertTitle>
                    <AlertDescription>
                      Establishing connection to the processing service. This may take a moment.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-4">
                      <FileDigit className="h-10 w-10 text-gray-600" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900 truncate max-w-[250px]">
                        {documentName}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isLoading ? "secondary" : "outline"} className={isLoading ? "animate-pulse" : ""}>
                          {Math.round(progress)}% complete
                        </Badge>
                        
                        {/* Button group for restart and cancel */}
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={handleRestart}
                            className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white hover:bg-gray-100 h-7 px-2 py-1"
                            title="Restart Processing"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Restart
                          </button>
                          
                          <button 
                            onClick={handleCancel}
                            className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white hover:bg-gray-100 h-7 px-2 py-1"
                            title="Cancel Processing"
                            disabled={isCanceling}
                          >
                            {isCanceling ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Canceling...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </>
                            )}
                          </button>
                        </div>
                        
                        {isLoading && (
                          <span className="flex items-center text-xs text-gray-500">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 
                            Updating
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Current stage with visual indicator */}
                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    {progress < 25 ? (
                      <Loader2 className="h-6 w-6 text-gray-600 animate-spin mr-4" />
                    ) : progress < 100 ? (
                      <FileText className="h-6 w-6 text-gray-600 mr-4" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-gray-700 mr-4" />
                    )}
                    <div>
                      <div className="font-medium">{currentStage}</div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{timeRemaining}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-500 transition-all duration-500 ease-in-out rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    {/* Progress steps */}
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <div className={progress >= 25 ? "text-gray-700 font-medium" : ""}>Extraction</div>
                      <div className={progress >= 50 ? "text-gray-700 font-medium" : ""}>Processing</div>
                      <div className={progress >= 75 ? "text-gray-700 font-medium" : ""}>Finalizing</div>
                      <div className={progress >= 100 ? "text-gray-700 font-medium" : ""}>Complete</div>
                    </div>
                  </div>
                  
                  {/* Details grid with info */}
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center mb-2">
                        <Clock className="h-4 w-4 text-gray-500 mr-2" />
                        <p className="text-xs font-medium text-gray-500">Time Elapsed</p>
                      </div>
                      <p className="text-sm font-medium">{formatTime(timeElapsed)}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center mb-2">
                        <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                        <p className="text-xs font-medium text-gray-500">Date</p>
                      </div>
                      <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center mb-2">
                        <Share2 className="h-4 w-4 text-gray-500 mr-2" />
                        <p className="text-xs font-medium text-gray-500">ID</p>
                      </div>
                      <p className="text-sm font-mono truncate" title={pdfId}>{pdfId.substring(0, 10)}...</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// Main page component - a Server Component
export default function ProcessingPage({ params }: { params: { pdfId: string } }) {
  // Properly unwrap the params using React.use, with correct type assertion
  const unwrappedParams = use(params as any) as { pdfId: string };
  
  return <ProcessingContent pdfId={unwrappedParams.pdfId} />
}
