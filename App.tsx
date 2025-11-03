
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ParsedProposal, HistoryItem, PriorityLevel } from './types';
import { getPriceEstimate } from './services/geminiService';
import { ImageUpload } from './components/ImageUpload';
import { PriceEstimateDisplay } from './components/PriceEstimateDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LogoIcon, HistoryIcon, TrashIcon, DocumentArrowDownIcon, XMarkIcon } from './components/icons';
import { EngagingLoader } from './components/EngagingLoader';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HISTORY_KEY = 'NEXY_AI_HISTORY';

// --- Lead Capture Modal Component ---
interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ParsedProposal | null;
}

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({ isOpen, onClose, proposal }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Reset state when modal is reopened
    if (isOpen) {
      setEmail('');
      setIsSubmitting(false);
      setSubmitMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !proposal) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch('/api/save-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, proposal }),
      });

      if (!response.ok) {
        let errorText = 'Failed to save lead. Please try again.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorText = errorData.error;
          }
        } catch (jsonError) {
          // Response body wasn't JSON, use the default error message.
        }
        throw new Error(errorText);
      }

      setSubmitMessage({ type: 'success', text: 'Thank you! Our sourcing expert will contact you shortly.' });
      setTimeout(() => {
        onClose();
      }, 3000); // Close modal after 3 seconds on success

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setSubmitMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-brand-secondary rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Get a Full Quote & Consultation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close modal">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {!submitMessage ? (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-300 mb-4">Enter your email below, and our sourcing experts will provide a detailed quote based on this AI analysis.</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-dark border border-gray-600 rounded-md p-3 mb-4 text-brand-light focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                placeholder="your.email@example.com"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
              >
                {isSubmitting ? <><LoadingSpinner /> Submitting...</> : 'Request My Quote'}
              </button>
            </form>
          ) : (
            <div className={`text-center p-4 rounded-md ${submitMessage.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
              <p>{submitMessage.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// --- History Component ---
interface HistoryPanelProps {
  history: HistoryItem[];
  activeHistoryId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, activeHistoryId, onSelect, onDelete, onClear }) => {
  if (history.length === 0) {
    return null; // Don't render anything if there's no history
  }

  const getPriorityColor = (priority: PriorityLevel) => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-brand-secondary p-6 rounded-lg shadow-lg mt-8">
      <h2 className="flex items-center text-2xl font-semibold mb-4 border-b-2 border-brand-primary pb-2">
        <HistoryIcon className="w-6 h-6 mr-3" />
        Sourcing History
      </h2>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {history.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors duration-200 ${
              activeHistoryId === item.id
                ? 'bg-brand-primary/20'
                : 'hover:bg-brand-dark/50'
            }`}
          >
            <div className="flex items-center flex-1 overflow-hidden">
              <span
                className={`w-3 h-3 rounded-full mr-3 flex-shrink-0`}
                style={{ backgroundColor: getPriorityColor(item.priority).replace('bg-', '#') }}
                title={`Priority: ${item.priority}`}
              ></span>
              <div className="flex-1 overflow-hidden">
                 <p className={`font-semibold truncate ${activeHistoryId === item.id ? 'text-brand-primary' : ''}`}>
                  {item.productName || 'Untitled Analysis'}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent onSelect from firing
                onDelete(item.id);
              }}
              className="ml-4 p-1 text-gray-400 hover:text-red-400 rounded-full transition-colors"
              aria-label={`Delete item ${item.productName}`}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      {history.length > 0 && (
        <button
          onClick={onClear}
          className="w-full mt-4 text-sm text-center text-gray-400 hover:text-red-400 transition-colors duration-200"
        >
          Clear All History
        </button>
      )}
    </div>
  );
};


// --- Main App Component ---
const App: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<{ base64: string; mimeType: string; }[]>([]);
  const [productDescription, setProductDescription] = useState<string>('');
  const [exportCountry, setExportCountry] = useState<string>('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [proposal, setProposal] = useState<ParsedProposal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const detailsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  };

  const extractAndParseJson = (text: string): ParsedProposal | null => {
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch || !jsonMatch[1]) {
        const braceStart = text.indexOf('{');
        const braceEnd = text.lastIndexOf('}');
        if(braceStart !== -1 && braceEnd !== -1) {
          const potentialJson = text.substring(braceStart, braceEnd + 1);
          return JSON.parse(potentialJson);
        }
        throw new Error('No valid JSON block found in the response.');
      }
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('JSON Parsing Error:', e);
      setError('Failed to parse the data from the AI. The format was invalid.');
      return null;
    }
  };

  const handleSubmit = useCallback(async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image of the product.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProposal(null);

    try {
      const responseText = await getPriceEstimate(productDescription, uploadedImages, exportCountry, priority);
      if (responseText) {
        const parsedData = extractAndParseJson(responseText);
        if (parsedData) {
          setProposal(parsedData);
          const newItem: HistoryItem = {
            id: `item-${Date.now()}`,
            productName: parsedData.productName,
            proposal: parsedData,
            createdAt: new Date().toISOString(),
            priority: priority,
          };
          // Sort history to show newest first
          const newHistory = [newItem, ...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          saveHistory(newHistory);
          setActiveHistoryId(newItem.id);
        }
      } else {
        setError('Received an empty response from the AI.');
      }
    } catch (err) {
      console.error('Error getting price estimate:', err);
      setError('An error occurred while fetching the estimate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImages, productDescription, exportCountry, priority, history]);

  const handleExportPdf = async () => {
    if (!proposal || !analysisContainerRef.current) {
      console.error("No analysis available to export.");
      return;
    }

    setIsExporting(true);
    const element = analysisContainerRef.current;
    
    // Temporarily remove animation for a clean capture
    const analysisDisplay = element.querySelector('.animate-fade-in');
    analysisDisplay?.classList.remove('animate-fade-in');

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#393E46', // Match the component's background
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = imgWidth / pdfWidth;
      const scaledHeight = imgHeight / ratio;

      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
      
      const fileName = `${proposal.productName?.replace(/[\s/]/g, '_') || 'Sourcing_Analysis'}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error("Error exporting PDF:", error);
      setError("Sorry, there was an error creating the PDF report.");
    } finally {
      // Restore animation class
      analysisDisplay?.classList.add('animate-fade-in');
      setIsExporting(false);
    }
  };

  const handleSelectHistory = (id: string) => {
    const selectedItem = history.find(item => item.id === id);
    if (selectedItem) {
      setProposal(selectedItem.proposal);
      setActiveHistoryId(id);
      setError(null);
    }
  };

  const handleDeleteHistory = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    saveHistory(newHistory);
    if (activeHistoryId === id) {
      setProposal(null);
      setActiveHistoryId(null);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all sourcing history? This cannot be undone.')) {
      saveHistory([]);
      setProposal(null);
      setActiveHistoryId(null);
    }
  };
  
  const handleImageUpload = useCallback((images: { base64: string; mimeType: string; }[]) => {
      setUploadedImages(images);
      setError(null);
      setActiveHistoryId(null);
      if (images.length > 0 && !productDescription) {
        detailsTextareaRef.current?.focus();
      }
  }, [productDescription]);

  return (
    <>
      <LeadCaptureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} proposal={proposal} />
      <div className="min-h-screen bg-brand-dark text-brand-light font-sans">
        <div className="container mx-auto p-4 md:p-8">
          <header className="text-center mb-8 md:mb-12">
             <div className="flex items-center justify-center gap-3 mb-2">
              <LogoIcon className="h-12 w-12 text-brand-primary" />
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-left">
                Nexy.ai <br/><span className="text-brand-primary">Sourcing Consultant</span>
              </h1>
            </div>
            <p className="text-lg text-gray-400">
              Get an instant, AI-powered sourcing analysis for any product.
            </p>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="lg:sticky top-8">
              <div className="bg-brand-secondary p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 border-b-2 border-brand-primary pb-2">
                  1. Product Details
                </h2>
                <div className="space-y-6">
                  <ImageUpload onImageUpload={handleImageUpload} />
                   <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-2">
                      Preferred Export Country
                    </label>
                    <select
                      id="country"
                      value={exportCountry}
                      onChange={(e) => {
                        setExportCountry(e.target.value);
                        setActiveHistoryId(null);
                      }}
                      className="w-full bg-brand-dark border border-gray-600 rounded-md p-3 text-brand-light focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                    >
                      <option value="">Any Country</option>
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Canada">Canada</option>
                      <option value="China">China</option>
                      <option value="Germany">Germany</option>
                      <option value="India">India</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Italy">Italy</option>
                      <option value="Japan">Japan</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Poland">Poland</option>
                      <option value="South Korea">South Korea</option>
                      <option value="Taiwan">Taiwan</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Turkey">Turkey</option>
                      <option value="USA">USA</option>
                      <option value="Vietnam">Vietnam</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="details" className="block text-sm font-medium text-gray-300 mb-2">
                      Optional Details
                    </label>
                    <textarea
                      id="details"
                      ref={detailsTextareaRef}
                      rows={3}
                      className="w-full bg-brand-dark border border-gray-600 rounded-md p-3 text-brand-light focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                      placeholder="e.g., 'Looking for sustainable materials', 'Need 10,000 units', 'Target price is $0.50/unit'"
                      value={productDescription}
                      onChange={(e) => {
                        setProductDescription(e.target.value);
                        setActiveHistoryId(null);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Low', 'Medium', 'High'] as PriorityLevel[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            setPriority(level);
                            setActiveHistoryId(null);
                          }}
                          className={`px-4 py-2 text-sm font-semibold text-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary ${
                            priority === level
                              ? 'bg-brand-primary text-white shadow'
                              : 'bg-brand-dark hover:bg-brand-dark/50 text-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-700 space-y-3">
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || uploadedImages.length === 0}
                      className="w-full flex items-center justify-center bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 disabled:scale-100"
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner />
                          Analyzing...
                        </>
                      ) : (
                        'Get Sourcing Analysis'
                      )}
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={!proposal || isLoading || isExporting}
                      className="w-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                    >
                      {isExporting ? (
                        <>
                          <LoadingSpinner />
                          Exporting PDF...
                        </>
                      ) : (
                        <>
                          <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                          Export Analysis
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <HistoryPanel
                history={history}
                activeHistoryId={activeHistoryId}
                onSelect={handleSelectHistory}
                onDelete={handleDeleteHistory}
                onClear={handleClearHistory}
              />
            </div>
            
            <div className="bg-brand-secondary p-6 rounded-lg shadow-lg" ref={analysisContainerRef}>
              <h2 className="text-2xl font-semibold mb-4 border-b-2 border-brand-primary pb-2">
                2. Sourcing Analysis
              </h2>
              <div>
                {isLoading && <EngagingLoader />}
                {error && (
                  <div className="flex items-center justify-center h-full bg-red-900/50 text-red-300 p-4 rounded-lg">
                    <p>{error}</p>
                  </div>
                )}
                {!isLoading && !error && proposal && 
                  <PriceEstimateDisplay 
                    proposal={proposal} 
                    onRequestQuote={() => setIsModalOpen(true)} 
                  />
                }
                {!isLoading && !error && !proposal && (
                   <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
                    <p className="text-lg">Your sourcing analysis will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
