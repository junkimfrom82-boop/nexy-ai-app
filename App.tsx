// src/App.tsx

import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client'; // [!] ReactDOM import 추가
import { getPriceEstimate } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import { PriceEstimateDisplay } from './components/PriceEstimateDisplay';
import { LogoIcon, HistoryIcon, TrashIcon, DocumentArrowDownIcon, XMarkIcon } from './components/icons';
// [!] CSS와 다른 컴포넌트 import (존재하지 않아도 코드가 작동하도록 임시 정의)
import './index.css'; 
const UploadIcon = () => (
  <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);
const Spinner = () => (<div className="animate-spin text-brand-primary"></div>);
const LoadingSpinner = Spinner;
const ImageUpload = ({ onImageUpload }) => <div className="h-40 bg-gray-700 rounded-lg flex items-center justify-center">Image Upload Component</div>;


// --- [여기에 types.ts 내용 포함] --- (이전 답변과 동일한 타입 정의)
export interface AiDataResponse {
  productName: string | null; specs: { dimensions: string | null; weight: string | null; } | null;
  demandAnalysis: { usMarketDemand: string | null; competitionLevel: string | null; genAiInsight: string | null; } | null;
  factoryBids: Array<{ name: string; price: number; specialty: string | null; risk: string | null; sustainability: string | null; sourceUrl: string | null; }> | null;
  customizationOptions: string[] | null;
  logisticsAndTariffs: { htsCode: string | null; estimatedFreight: number | null; estimatedDuties: number | null; estimatedFees: number | null; carbonEstimate: string | null; } | null;
  sources: { tariff: string[] | null; demand: string[] | null; } | null;
}
export interface ParsedProposal {
  aiData: AiDataResponse; stableBid: { name: string; price: number; specialty: string | null; risk: string | null; sustainability: string | null; sourceUrl: string | null; };
  ddpBreakdown: { factoryCost: number; freight: number; duties: number; fees: number; nexyMargin: number; total: number; };
  priceList: Array<{ quantity: number; perUnitDDP: number; totalPrice: number; }>;
}
export interface PriceDataPoint { quantity: number; perUnitDDP: number; totalPrice: number; }
// --- [Types 정의 끝] ---


// [!] AI JSON 파서/계산기
const parseAndCalculateProposal = (aiJsonText: string): ParsedProposal | null => {
  try {
    const cleanJsonText = aiJsonText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const aiData: AiDataResponse = JSON.parse(cleanJsonText);
    
    if (!aiData.factoryBids || aiData.factoryBids.length < 2) throw new Error("Insufficient bids.");
    
    const sortedBids = [...aiData.factoryBids].sort((a, b) => a.price - b.price);
    const stableBid = sortedBids[1]; 
    
    const logistics = aiData.logisticsAndTariffs;
    const freight = logistics?.estimatedFreight || 0;
    const duties = logistics?.estimatedDuties || 0;
    const fees = logistics?.estimatedFees || 0;
    
    const baseLandedCost = stableBid.price + freight + duties + fees;
    const margin1000 = 1.25; 
    const ddp1000 = baseLandedCost * margin1000;
    const ddp500 = ddp1000 * 1.15;  
    const ddp5000 = ddp1000 * 0.9; 

    const priceList: PriceDataPoint[] = [
      { quantity: 500, perUnitDDP: ddp500, totalPrice: ddp500 * 500 },
      { quantity: 1000, perUnitDDP: ddp1000, totalPrice: ddp1000 * 1000 },
      { quantity: 5000, perUnitDDP: ddp5000, totalPrice: ddp5000 * 5000 },
    ];

    const nexyMargin = ddp1000 - baseLandedCost;
    const ddpBreakdown = {
      factoryCost: stableBid.price, freight, duties, fees,
      nexyMargin: nexyMargin > 0 ? nexyMargin : 0,
      total: ddp1000,
    };

    return {
      aiData,
      stableBid: stableBid as any, // 타입 호환을 위해 as any 사용
      ddpBreakdown,
      priceList,
    };

  } catch (error) {
    console.error("Failed to parse or calculate proposal:", error);
    return null;
  }
};


// [!] Firebase 저장 함수 (Vercel API를 호출)
const saveLeadToApi = async (
  email: string,
  proposal: ParsedProposal
): Promise<{success: boolean, message: string}> => {
  // ... (Firebase API 호출 로직은 이전 답변과 동일)
  try {
    const response = await fetch('/api/save-lead', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, proposal }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || "Failed to save lead." };
    }
    return { success: true, message: "Proposal sent!" };
  } catch (error) {
    console.error("Error saving lead via API:", error);
    return { success: false, message: "An error occurred." };
  }
};


// [!] Email Modal (Lead Capture) Component (간소화)
const LeadCaptureModal: React.FC<any> = ({ isOpen, onClose, onSubmit, proposal }) => {
  // ... (LeadCaptureModal UI/Logic)
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* UI: Email input form and button */}
      <div className="bg-brand-secondary p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white">Get Your Quote & Free Unit</h3>
        <button onClick={() => onSubmit("test@example.com")}>Submit (Test)</button>
      </div>
    </div>
  );
};


// --- Main App Component ---
const App = () => {
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [productDescription, setProductDescription] = useState<string>('');
  const [exportCountry, setExportCountry] = useState<string>('');
  const [priority, setPriority] = useState<string>('Medium');
  const [proposal, setProposal] = useState<ParsedProposal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const handleSubmit = useCallback(async () => {
    // [!] 제출 로직 (생략)
  }, [uploadedImages, productDescription, exportCountry, priority]);

  const handleGetQuoteClick = () => {
    if (!proposal) return;
    setIsModalOpen(true);
  };

  const handleEmailSubmit = (email: string) => {
    if (!proposal) return Promise.reject("No proposal");
    return saveLeadToApi(email, proposal);
  };


  return (
    <div className="min-h-screen bg-brand-dark text-brand-light font-sans">
      {/* ... UI 코드 (생략) ... */}
      <LeadCaptureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleEmailSubmit} proposal={proposal} />
      <div className="container mx-auto p-4 md:p-8">
        {/* ... Header and Main Content UI ... */}
        <button onClick={handleSubmit}>Get Sourcing Analysis</button>
        {proposal && <button onClick={handleGetQuoteClick}>Request Quote</button>}
      </div>
    </div>
  );
};

// [CRITICAL FIX] index.tsx 파일이 삭제되었으므로, App.tsx에서 렌더링을 직접 처리합니다.
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
// [!] export default App 은 삭제합니다.