import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

const loadingSteps = [
  'Analyzing product image with vision AI...',
  'Researching current US market demand...',
  'Querying B2B supplier network for bids...',
  'Benchmarking against competitor pricing...',
  'Calculating international logistics & duties...',
  'Checking for applicable compliance standards...',
  'Compiling your final sourcing report...'
];

export const EngagingLoader: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prevStep => (prevStep + 1) % loadingSteps.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <LoadingSpinner className="h-12 w-12 mb-4" />
      <p className="text-lg font-semibold text-brand-light">Generating your sourcing proposal...</p>
      <p className="text-gray-400 mt-2 transition-opacity duration-500 h-6">
        {loadingSteps[currentStep]}
      </p>
    </div>
  );
};
