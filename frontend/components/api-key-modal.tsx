"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface ApiKeyModalProps {
  onClose?: () => void
}

export function ApiKeyModal({ onClose }: ApiKeyModalProps) {
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Check if API key is set on initial load
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // First attempt to check if backend is available
        const response = await fetch('http://localhost:8000/api/v1/settings/api-key-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (!data.isSet) {
            setOpen(true);
          }
        } else {
          console.error("Error checking API key status:", response.statusText);
          setOpen(true);
        }
      } catch (error) {
        console.error("Error checking API key status:", error);
        // Show modal if we can't verify key status
        setOpen(true);
      }
    };

    // Delay the check to avoid interfering with initial page load
    const timer = setTimeout(() => {
      checkApiKey();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Anthropic API key",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      if (response.ok) {
        toast({
          title: "API Key Saved",
          description: "Your Anthropic API key has been saved successfully"
        });
        setOpen(false);
        if (onClose) onClose();
      } else {
        throw new Error(`Failed to save API key: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error Saving API Key",
        description: "There was an error saving your API key. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter your Anthropic API Key</DialogTitle>
          <DialogDescription>
            This application requires an Anthropic API key to generate Q&A pairs from your PDF documents.
            Your key will be stored securely on the server and not shared.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="apiKey">Anthropic API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              You can get your API key from the{" "}
              <a 
                href="https://console.anthropic.com/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anthropic Console
              </a>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
