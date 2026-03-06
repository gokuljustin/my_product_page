import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import OpenAI from 'openai'
import { FileText, Loader2, Copy, Download, Sparkles } from 'lucide-react'
import './App.css'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

interface FormData {
  productName: string
  productDescription: string
  targetAudience: string
  problemStatement: string
  keyFeatures: string
  successMetrics: string
}

const initialFormData: FormData = {
  productName: '',
  productDescription: '',
  targetAudience: '',
  problemStatement: '',
  keyFeatures: '',
  successMetrics: '',
}

function buildPrompt(data: FormData): string {
  return `You are a senior product manager. Generate a detailed, professional Product Requirements Document (PRD) in Markdown format based on the following inputs:

**Product Name:** ${data.productName}
**Product Description:** ${data.productDescription}
**Target Audience:** ${data.targetAudience}
**Problem Statement:** ${data.problemStatement}
**Key Features:** ${data.keyFeatures}
**Success Metrics:** ${data.successMetrics}

The PRD should include the following sections:
1. **Executive Summary**
2. **Problem Statement & Goals**
3. **Target Audience & User Personas**
4. **Scope & Requirements** (Functional and Non-Functional)
5. **User Stories**
6. **Key Features & Prioritization** (using MoSCoW method)
7. **Success Metrics & KPIs**
8. **Timeline & Milestones** (suggested phases)
9. **Risks & Mitigations**
10. **Open Questions**

Make it thorough, actionable, and well-structured. Use tables where appropriate.`
}

function App() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [apiKey, setApiKey] = useState(OPENAI_API_KEY)
  const [generatedPRD, setGeneratedPRD] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key.')
      return
    }
    if (!formData.productName.trim() || !formData.productDescription.trim()) {
      setError('Please fill in at least the Product Name and Description.')
      return
    }

    setError('')
    setIsLoading(true)
    setGeneratedPRD('')

    try {
      const client = new OpenAI({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true,
      })

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert product manager who creates comprehensive PRDs.' },
          { role: 'user', content: buildPrompt(formData) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        setGeneratedPRD(content)
      } else {
        setError('No content was generated. Please try again.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(`Failed to generate PRD: ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPRD)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedPRD], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formData.productName.replace(/\s+/g, '-').toLowerCase() || 'prd'}-document.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setFormData(initialFormData)
    setGeneratedPRD('')
    setError('')
  }

  const isFormValid = formData.productName.trim() && formData.productDescription.trim() && apiKey.trim()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">PRD Generator</h1>
            <p className="text-sm text-slate-500">Generate professional Product Requirements Documents with AI</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* API Key Section */}
        <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm bg-slate-50"
          />
          <p className="text-xs text-slate-400 mt-1">Your key is used client-side only and never stored on any server.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">Product Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={e => handleInputChange('productName', e.target.value)}
                  placeholder="e.g., TaskFlow Pro"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.productDescription}
                  onChange={e => handleInputChange('productDescription', e.target.value)}
                  placeholder="Briefly describe what the product does and its core value proposition..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Audience
                </label>
                <textarea
                  value={formData.targetAudience}
                  onChange={e => handleInputChange('targetAudience', e.target.value)}
                  placeholder="Who are the primary users? e.g., Product managers at mid-size SaaS companies..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Problem Statement
                </label>
                <textarea
                  value={formData.problemStatement}
                  onChange={e => handleInputChange('problemStatement', e.target.value)}
                  placeholder="What problem does this product solve? What pain points exist today?"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Key Features
                </label>
                <textarea
                  value={formData.keyFeatures}
                  onChange={e => handleInputChange('keyFeatures', e.target.value)}
                  placeholder="List the main features (one per line or comma-separated)..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Success Metrics
                </label>
                <textarea
                  value={formData.successMetrics}
                  onChange={e => handleInputChange('successMetrics', e.target.value)}
                  placeholder="How will you measure success? e.g., user retention, conversion rate..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={isLoading || !isFormValid}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate PRD
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 text-slate-600 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Generated PRD</h2>
              {generatedPRD && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="text-sm">Generating your PRD... This may take a moment.</p>
              </div>
            ) : generatedPRD ? (
              <div className="prose prose-sm prose-slate max-w-none overflow-auto max-h-screen">
                <ReactMarkdown>{generatedPRD}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileText size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Your generated PRD will appear here</p>
                <p className="text-xs mt-1">Fill in the product details and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-sm text-slate-400 border-t border-slate-200">
        PRD Generator - Powered by OpenAI
      </footer>
    </div>
  )
}

export default App
