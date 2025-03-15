"use client"

import React, { useState, use } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, FileText, GripVertical, Plus, Save, Trash2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

// Sample data for demonstration (same as in results page)
const sampleQAPairs = [
  {
    id: "q1",
    question: "What are the key financial highlights for Q1 2023?",
    answer:
      "The key financial highlights for Q1 2023 include a 15% increase in revenue reaching $2.3M, a gross margin improvement to 68%, and an EBITDA of $450K representing a 12% increase year-over-year.",
    page: 1,
    confidence: 0.92,
    section: "Financial Summary",
  },
  {
    id: "q2",
    question: "Who are the members of the executive leadership team?",
    answer:
      "The executive leadership team consists of Jane Smith (CEO), John Davis (CFO), Sarah Johnson (CTO), Michael Brown (COO), and Lisa Anderson (CMO).",
    page: 3,
    confidence: 0.89,
    section: "Corporate Governance",
  },
  {
    id: "q3",
    question: "What is the company's sustainability strategy?",
    answer:
      "The company's sustainability strategy focuses on three pillars: reducing carbon emissions by 30% by 2025, implementing circular economy principles in product design, and ensuring ethical supply chain practices through regular audits and supplier certifications.",
    page: 7,
    confidence: 0.85,
    section: "Sustainability",
  },
  {
    id: "q4",
    question: "What are the main risk factors identified in the report?",
    answer:
      "The main risk factors identified include market volatility, regulatory changes in key markets, supply chain disruptions, cybersecurity threats, and competition from emerging technologies.",
    page: 12,
    confidence: 0.91,
    section: "Risk Assessment",
  },
  {
    id: "q5",
    question: "What is the projected growth rate for the next fiscal year?",
    answer:
      "The projected growth rate for the next fiscal year is 18-22%, driven by expansion into new markets, launch of the premium product line, and strategic acquisitions in complementary business segments.",
    page: 15,
    confidence: 0.87,
    section: "Future Outlook",
  },
]

// Content component to handle all the functionality
function EditContent({ pdfId }: { pdfId: string }) {
  const router = useRouter()
  const [qaPairs, setQaPairs] = useState(sampleQAPairs)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(
    Object.fromEntries(sampleQAPairs.map((qa) => [qa.id, false])),
  )

  const handleToggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setOpenItems((prev) => ({
      ...prev,
      [id]: true,
    }))
  }

  const handleSaveEdit = (id: string, question: string, answer: string) => {
    setQaPairs((prev) => prev.map((qa) => (qa.id === id ? { ...qa, question, answer } : qa)))
    setEditingId(null)
    setHasChanges(true)
    toast({
      title: "Changes saved",
      description: "Your edits have been saved to this Q&A pair.",
    })
  }

  const handleDelete = (id: string) => {
    setQaPairs((prev) => prev.filter((qa) => qa.id !== id))
    setHasChanges(true)
    toast({
      title: "Q&A pair deleted",
      description: "The Q&A pair has been removed.",
    })
  }

  const handleAddNew = () => {
    const newId = `q${qaPairs.length + 1}`
    const newQA = {
      id: newId,
      question: "New question",
      answer: "New answer",
      page: 1,
      confidence: 0.7,
      section: "General",
    }

    setQaPairs((prev) => [...prev, newQA])
    setEditingId(newId)
    setOpenItems((prev) => ({
      ...prev,
      [newId]: true,
    }))
    setHasChanges(true)
  }

  const handleSaveAll = () => {
    // In a real app, this would save to the backend
    setHasChanges(false)
    toast({
      title: "All changes saved",
      description: "Your edits have been saved successfully.",
    })

    // Navigate back to results page
    router.push(`/results/${pdfId}`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/results/${pdfId}`)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveAll} disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
        {/* Document Preview Panel */}
        <div className="border-r">
          <div className="sticky top-0 z-10 flex items-center border-b bg-background px-4 py-2">
            <h2 className="font-medium">Document Preview</h2>
          </div>

          <div className="p-4">
            <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">Document Preview</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                This is where the PDF preview would be displayed. In a real application, this would show the actual
                document with highlighted sections corresponding to the selected Q&A pair.
              </p>
            </div>
          </div>
        </div>

        {/* Q&A Editing Panel */}
        <div className="flex flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
            <h2 className="font-medium">Edit Q&A Pairs</h2>
            <Button size="sm" onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Pair
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {qaPairs.map((qa) => (
                <QAPairEditor
                  key={qa.id}
                  qa={qa}
                  isOpen={openItems[qa.id]}
                  isEditing={editingId === qa.id}
                  onToggle={() => handleToggleItem(qa.id)}
                  onEdit={() => handleEdit(qa.id)}
                  onSave={handleSaveEdit}
                  onDelete={() => handleDelete(qa.id)}
                />
              ))}

              {qaPairs.length === 0 && (
                <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <h3 className="font-medium">No Q&A pairs</h3>
                  <p className="text-sm text-muted-foreground">
                    Click "Add New Pair" to create a new question and answer
                  </p>
                  <Button className="mt-4" size="sm" onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Pair
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface QAPairEditorProps {
  qa: (typeof sampleQAPairs)[0]
  isOpen: boolean
  isEditing: boolean
  onToggle: () => void
  onEdit: () => void
  onSave: (id: string, question: string, answer: string) => void
  onDelete: () => void
}

function QAPairEditor({ qa, isOpen, isEditing, onToggle, onEdit, onSave, onDelete }: QAPairEditorProps) {
  const [question, setQuestion] = useState(qa.question)
  const [answer, setAnswer] = useState(qa.answer)

  const handleSave = () => {
    onSave(qa.id, question, answer)
  }

  const handleCancel = () => {
    setQuestion(qa.question)
    setAnswer(qa.answer)
    onEdit() // This will toggle off editing mode
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <div className="flex items-center p-2">
          <GripVertical className="mr-2 h-5 w-5 cursor-move text-muted-foreground" />
          <CollapsibleTrigger asChild>
            <div className="flex flex-1 cursor-pointer items-center justify-between py-2">
              <div className="flex-1 truncate pr-4">
                <h3 className="font-medium">{qa.question}</h3>
              </div>
              <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
            </div>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 pt-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor={`question-${qa.id}`} className="mb-2 block text-sm font-medium">
                    Question
                  </label>
                  <Input
                    id={`question-${qa.id}`}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter question"
                  />
                </div>
                <div>
                  <label htmlFor={`answer-${qa.id}`} className="mb-2 block text-sm font-medium">
                    Answer
                  </label>
                  <Textarea
                    id={`answer-${qa.id}`}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter answer"
                    rows={4}
                  />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={onDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Check className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p>{qa.answer}</p>
                <div className="mt-4 flex justify-between">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="mr-2">Page {qa.page}</span>
                    <span className="mr-2">•</span>
                    <span>{qa.section}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={onDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      Edit
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Main page component
export default function EditPage({ params }: { params: { pdfId: string } }) {
  const unwrappedParams = use(params as any) as { pdfId: string };

  // Forward the pdfId directly as a string prop to the content component
  return <EditContent pdfId={unwrappedParams.pdfId} />
}
