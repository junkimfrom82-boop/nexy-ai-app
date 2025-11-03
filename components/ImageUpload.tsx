import React, { useRef, useState, useCallback, useEffect } from 'react';
import { UploadIcon, StarIcon, XCircleIcon, InfoIcon } from './icons';
import { analyzeImageQuality } from '../services/geminiService';
import { ImageQuality } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ImageUploadProps {
  onImageUpload: (images: { base64: string; mimeType: string }[]) => void;
}

const MAX_FILES = 5;
const MAX_SIZE_MB = 4;

const qualityTooltipContent = (
    <div className="text-left">
        <p className="font-bold mb-1">Image Quality Score</p>
        <p className="mb-2">Based on analysis of:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
            <li><strong>Clarity & Focus:</strong> Sharpness of the product.</li>
            <li><strong>Lighting:</strong> Even lighting, no harsh shadows.</li>
            <li><strong>Background:</strong> Simple, non-distracting background.</li>
            <li><strong>Completeness:</strong> Full product is visible.</li>
        </ul>
        <p className="mt-2 pt-2 border-t border-gray-600"><strong>Tip:</strong> Use a neutral background with bright, indirect light for best results.</p>
    </div>
);

const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({ content, children }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-brand-dark text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-brand-dark"></div>
      </div>
    </div>
  );
};

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [qualities, setQualities] = useState<ImageQuality[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  // Custom error setter with auto-clear functionality
  const setAndClearError = useCallback((message: string | null) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(message);
    if (message) {
      errorTimeoutRef.current = window.setTimeout(() => {
        setError(null);
      }, 5000); // Clear error after 5 seconds
    }
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // This effect processes files and calls the parent component
    if (files.length === 0) {
      onImageUpload([]);
      return;
    }

    const processFiles = async () => {
      try {
        const imagePromises = files.map(file => {
          return new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              resolve({ base64: base64Data, mimeType: file.type });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
          });
        });

        const imageData = await Promise.all(imagePromises);
        
        // Reorder to put primary image first
        if (primaryIndex >= 0 && primaryIndex < imageData.length) {
          const primary = imageData[primaryIndex];
          const others = imageData.filter((_, i) => i !== primaryIndex);
          onImageUpload([primary, ...others]);
        } else {
          onImageUpload(imageData);
        }
      } catch (e) {
        console.error("Error processing files:", e);
        setAndClearError("Could not process one or more images. They may be corrupted.");
      }
    };

    processFiles();
  }, [files, primaryIndex, onImageUpload, setAndClearError]);

  // Effect to auto-select the best quality image as primary
  useEffect(() => {
    const allAnalyzed = qualities.length > 1 && qualities.every(q => !q.isLoading);
    if (allAnalyzed) {
      const bestImage = qualities.reduce((best, current, index) => {
        if (!current.score) return best;
        if (current.score > best.score) {
          return { score: current.score, index: index };
        }
        return best;
      }, { score: -1, index: 0 });

      if (bestImage.index !== primaryIndex) {
        setPrimaryIndex(bestImage.index);
      }
    }
  }, [qualities, primaryIndex]);
  
  // Effect for cleaning up object URLs
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const analyzeAndSetQualities = useCallback(async (newFiles: File[], startingIndex: number) => {
    for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            try {
                const analysisResult = await analyzeImageQuality({ base64: base64Data, mimeType: file.type });
                setQualities(prev => {
                    const updated = [...prev];
                    updated[startingIndex + i] = { isLoading: false, ...analysisResult };
                    return updated;
                });
            } catch (e) {
                console.error("Image quality analysis failed:", e);
                setQualities(prev => {
                    const updated = [...prev];
                    updated[startingIndex + i] = { isLoading: false, rating: 'Error', feedback: 'Analysis failed to complete.' };
                    return updated;
                });
            }
        };
    }
  }, []);

  const handleFiles = useCallback((incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    
    setAndClearError(null); // Clear previous errors on new upload attempt

    const acceptedFiles: File[] = [];
    let firstError: string | null = null;

    for (const file of Array.from(incomingFiles)) {
      if (files.length + acceptedFiles.length >= MAX_FILES) {
        if (!firstError) firstError = `Cannot exceed ${MAX_FILES} images. Some files were not added.`;
        break;
      }
      if (files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
        continue; // Silently skip duplicates
      }
      if (!file.type.startsWith('image/')) {
        if (!firstError) firstError = `File "${file.name}" is not a valid image. Please use formats like PNG or JPG.`;
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        if (!firstError) firstError = `File "${file.name}" is too large. Maximum size is ${MAX_SIZE_MB}MB.`;
        continue;
      }
      acceptedFiles.push(file);
    }

    if (firstError) {
      setAndClearError(firstError);
    }

    if (acceptedFiles.length === 0) return;

    const currentFileCount = files.length;
    const combinedFiles = [...files, ...acceptedFiles];
    setFiles(combinedFiles);

    const newPreviews = combinedFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    
    const newQualityStates: ImageQuality[] = acceptedFiles.map(() => ({ isLoading: true }));
    setQualities(prevQualities => [...prevQualities, ...newQualityStates]);
    analyzeAndSetQualities(acceptedFiles, currentFileCount);

  }, [files, analyzeAndSetQualities, setAndClearError]);
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if(event.target) event.target.value = '';
  }, [handleFiles]);
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);
  
  const handleRemoveImage = (indexToRemove: number) => {
    const newFiles = files.filter((_, index) => index !== indexToRemove);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    const newQualities = qualities.filter((_, index) => index !== indexToRemove);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    setQualities(newQualities);

    if (primaryIndex === indexToRemove) {
      setPrimaryIndex(0);
    } else if (primaryIndex > indexToRemove) {
      setPrimaryIndex(primaryIndex - 1);
    }
  };

  // --- Drag and Drop Reordering ---
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const reorderedFiles = [...files];
    const reorderedPreviews = [...previews];
    const reorderedQualities = [...qualities];

    const [draggedFile] = reorderedFiles.splice(draggedIndex, 1);
    const [draggedPreview] = reorderedPreviews.splice(draggedIndex, 1);
    const [draggedQuality] = reorderedQualities.splice(draggedIndex, 1);

    reorderedFiles.splice(index, 0, draggedFile);
    reorderedPreviews.splice(index, 0, draggedPreview);
    reorderedQualities.splice(index, 0, draggedQuality);

    // Update primary index
    if (primaryIndex === draggedIndex) {
      setPrimaryIndex(index);
    } else if (draggedIndex < primaryIndex && index >= primaryIndex) {
      setPrimaryIndex(primaryIndex - 1);
    } else if (draggedIndex > primaryIndex && index <= primaryIndex) {
      setPrimaryIndex(primaryIndex + 1);
    }

    setFiles(reorderedFiles);
    setPreviews(reorderedPreviews);
    setQualities(reorderedQualities);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAreaClick = () => fileInputRef.current?.click();
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();

  const getRatingColor = (rating: ImageQuality['rating']) => {
      switch (rating) {
          case 'Excellent': return 'bg-green-600 text-white';
          case 'Good': return 'bg-teal-600 text-white';
          case 'Fair': return 'bg-yellow-600 text-white';
          case 'Poor': return 'bg-red-600 text-white';
          case 'Error': return 'bg-gray-600 text-gray-300';
          default: return 'bg-brand-dark';
      }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Product Images (1 required, up to {MAX_FILES})
      </label>
      
      {previews.length > 0 && (
          <div className="mb-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {previews.map((src, index) => {
                const quality = qualities[index];
                return (
                  <div
                    key={src}
                    className={`relative group aspect-square transition-opacity duration-300 ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <button
                      onClick={() => setPrimaryIndex(index)}
                      className={`w-full h-full rounded-md overflow-hidden focus:outline-none focus:ring-offset-2 focus:ring-offset-brand-secondary transition-all duration-200 cursor-grab ${
                        index === primaryIndex ? 'ring-4 ring-brand-primary shadow-lg' : 'ring-1 ring-gray-600 hover:ring-brand-primary/50'
                      }`}
                    >
                      <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                    </button>

                    {quality?.isLoading && (
                        <div className="absolute inset-0 bg-brand-dark/70 flex items-center justify-center rounded-md">
                            <LoadingSpinner className="w-6 h-6" />
                        </div>
                    )}

                    {!quality?.isLoading && quality?.rating && (
                        <div className="absolute bottom-1 left-1 right-1">
                             <Tooltip content={quality.feedback && quality.rating !== 'Excellent' ? quality.feedback : qualityTooltipContent}>
                                <div className={`flex items-center justify-between text-xs px-2 py-1 rounded-md shadow-lg ${getRatingColor(quality.rating)}`}>
                                    <span className="font-bold">{quality.rating}</span>
                                    <div className="flex items-center gap-1">
                                        <span>{quality.score ?? ''}</span>
                                        <InfoIcon className="w-3.5 h-3.5 cursor-help" />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                    )}
                    
                    {index === primaryIndex && (
                      <div className="absolute top-1 left-1 bg-brand-primary text-white p-1 rounded-full shadow-lg" title="Primary Image">
                        <StarIcon className="w-3 h-3"/>
                      </div>
                    )}

                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-brand-dark/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <XCircleIcon className="w-5 h-5"/>
                    </button>
                  </div>
                )
            })}
          </div>
        )
      }

      {files.length < MAX_FILES && (
        <div
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors duration-200 cursor-pointer ${
            error ? 'border-red-500' : 'border-gray-600 hover:border-brand-primary'
          }`}
          onClick={handleAreaClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Image upload area"
        >
          <div className="space-y-1 text-center w-full">
            <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
            <div className="flex text-sm text-gray-400 justify-center">
              <p className="relative bg-brand-secondary rounded-md font-medium text-brand-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-brand-dark focus-within:ring-brand-primary">
                <span>Add images</span>
                <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" multiple />
              </p>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, etc. up to {MAX_SIZE_MB}MB</p>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
};