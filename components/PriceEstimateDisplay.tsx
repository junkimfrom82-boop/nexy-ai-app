
import React, { useState, useEffect, useMemo } from 'react';
import { ParsedProposal, FactoryBid, PackagingOption, PriorityLevel } from '../types';
import { InfoIcon, SpecsIcon, DemandIcon, FactoryIcon, CustomizeIcon, SourceIcon, LinkIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon, TagIcon, WarningIcon, MinusCircleIcon, BadgeCheckIcon, ChecklistIcon, ShipIcon, RocketLaunchIcon, UserIcon, MailIcon, ClipboardCheckIcon, TreesIcon, ChartPieIcon, XMarkIcon, ArrowTopRightOnSquareIcon, BellIcon, BellAlertIcon, CheckIcon, ClipboardIcon, PackageIcon, CalculatorIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

const PRICE_ALERTS_KEY = 'NEXY_AI_PRICE_ALERTS';

const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({ content, children }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-brand-dark text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-brand-dark"></div>
      </div>
    </div>
  );
};

const tooltipDefinitions = {
  htsCode: "The Harmonized Tariff Schedule (HTS) code is a 10-digit number used by US Customs to classify imported goods and determine duty rates.",
  incoterm: "Incoterms® are internationally recognized rules that define the responsibilities of sellers and buyers. EXW (Ex Works) means the buyer is responsible for all costs and risks from the factory's door.",
  mfnDuty: "Most-Favored-Nation (MFN) duties are the standard, non-discriminatory tariffs applied to imports from WTO member countries.",
  section301Duty: "These are additional tariffs imposed by the U.S. on certain goods imported from China under Section 301 of the Trade Act of 1974.",
  mpf: "The Merchandise Processing Fee (MPF) is a fee collected by US Customs and Border Protection to cover the costs of processing imported goods.",
  hmf: "The Harbor Maintenance Fee (HMF) is a fee collected by US Customs on imports arriving by sea to fund the maintenance of U.S. ports and harbors.",
  brokerageAndIsf: "Covers the cost of a customs broker to clear your goods and file the Importer Security Filing (ISF), which is required for ocean shipments before they are loaded.",
};


interface PriceEstimateDisplayProps {
  proposal: ParsedProposal;
  onRequestQuote: () => void;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string, date?: string }> = ({ title, icon, children, className, date }) => (
  <div className={`mb-8 bg-brand-dark/50 p-4 rounded-lg ${className}`}>
    <div className="flex justify-between items-center mb-3">
        <h3 className="flex items-center text-xl font-semibold text-brand-primary">
          {icon}
          <span className="ml-2">{title}</span>
        </h3>
        {date && <span className="text-xs text-gray-500">Updated: {date}</span>}
    </div>
    {children}
  </div>
);

const DataPoint: React.FC<{ label: string; value: React.ReactNode; unit?: string; tooltipContent?: string; className?: string }> = ({ label, value, unit, tooltipContent, className }) => (
  <div className={`flex justify-between items-center text-sm mb-1 ${className}`}>
    <div className="flex items-center gap-1.5">
        <span className="text-gray-400">{label}:</span>
        {tooltipContent && (
            <Tooltip content={tooltipContent}>
                <InfoIcon className="w-4 h-4 text-gray-500 cursor-help" />
            </Tooltip>
        )}
    </div>
    <span className="font-mono text-right">{value ?? 'N/A'}{unit}</span>
  </div>
);

const RiskIcon: React.FC<{ risk: string | null; className?: string }> = ({ risk, className }) => {
    const riskLevel = risk?.toLowerCase() ?? '';
    const finalClassName = `flex-shrink-0 ${className || 'w-4 h-4'}`.trim();

    if (riskLevel.includes('high')) {
        return <WarningIcon className={`${finalClassName} text-red-400`} />;
    }
    if (riskLevel.includes('medium')) {
        return <MinusCircleIcon className={`${finalClassName} text-yellow-400`} />;
    }
    if (riskLevel.includes('low')) {
        return <CheckCircleIcon className={`${finalClassName} text-green-400`} />;
    }
    return null;
}

const AdvantageIcon: React.FC<{ title: string }> = ({ title }) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('sample')) {
        return <RocketLaunchIcon className="h-5 w-5 text-brand-primary mt-0.5 flex-shrink-0" />;
    }
    if (lowerTitle.includes('packaging')) {
        return <CustomizeIcon className="h-5 w-5 text-brand-primary mt-0.5 flex-shrink-0" />;
    }
    if (lowerTitle.includes('agent')) {
        return <UserIcon className="h-5 w-5 text-brand-primary mt-0.5 flex-shrink-0" />;
    }
    return <ShieldCheckIcon className="h-5 w-5 text-brand-primary mt-0.5 flex-shrink-0" />;
};

type SustainabilityScore = 'Excellent' | 'Good' | 'Fair' | 'N/A';

const deriveSustainabilityScore = (sustainabilityText: string | null): SustainabilityScore => {
    if (!sustainabilityText) return 'N/A';
    const lowerText = sustainabilityText.toLowerCase();

    if (lowerText.includes('eco-certified') || lowerText.includes('gots') || lowerText.includes('iso 14001') || lowerText.includes('b corp')) {
        return 'Excellent';
    }
    if (lowerText.includes('recycled') || lowerText.includes('iso 9001') || lowerText.includes('oeko-tex')) {
        return 'Good';
    }
    if (lowerText.includes('offers') || lowerText.includes('options')) {
        return 'Fair';
    }
    if (lowerText.length > 5) { // If there's some text but no keywords, it's at least fair
        return 'Fair';
    }
    return 'N/A';
};

const getScoreColor = (score: SustainabilityScore): string => {
    switch (score) {
        case 'Excellent': return 'text-green-400';
        case 'Good': return 'text-teal-400';
        case 'Fair': return 'text-yellow-400';
        default: return 'text-gray-500';
    }
};

const SummaryCard: React.FC<{ proposal: ParsedProposal, onRequestQuote: () => void }> = ({ proposal, onRequestQuote }) => {
    const { productName, ddpPriceTiers, minimumOrderQuantity, leadTime, sampleAvailability } = proposal;
    const [isCopied, setIsCopied] = useState(false);

    const referencePrice = ddpPriceTiers.find(t => t.quantity === 1000) || ddpPriceTiers[0];
    const referenceQty = referencePrice?.quantity || minimumOrderQuantity || 0;

    const handleCopy = () => {
        const summaryText = `
Product: ${productName || 'N/A'}
DDP Price: $${referencePrice?.pricePerUnit.toFixed(2) || 'N/A'} at ${referenceQty.toLocaleString()} units
MOQ: ${minimumOrderQuantity?.toLocaleString() || 'N/A'} units
Lead Time: ${leadTime || 'N/A'}
Sample Available: ${sampleAvailability ? 'Yes' : 'No'}
        `.trim();
        navigator.clipboard.writeText(summaryText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="sticky top-6 z-20 bg-brand-dark/80 backdrop-blur-sm border border-brand-primary/50 rounded-lg p-4 shadow-lg mb-8">
            <h3 className="font-bold text-lg text-white truncate">{productName}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-3 text-center">
                <div>
                    <div className="text-xs text-gray-400">DDP Price</div>
                    <div className="text-lg font-bold text-brand-primary">${referencePrice?.pricePerUnit.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">at {referenceQty.toLocaleString()} units</div>
                </div>
                 <div>
                    <div className="text-xs text-gray-400">MOQ</div>
                    <div className="text-lg font-bold">{minimumOrderQuantity?.toLocaleString() || 'N/A'}</div>
                     <div className="text-xs text-gray-500">units</div>
                </div>
                 <div>
                    <div className="text-xs text-gray-400">Lead Time</div>
                    <div className="text-lg font-bold">{leadTime || 'N/A'}</div>
                    <div className="text-xs text-gray-500">&nbsp;</div>
                </div>
                 <div>
                    <div className="text-xs text-gray-400">Sample</div>
                    <div className={`text-lg font-bold ${sampleAvailability ? 'text-green-400' : 'text-red-400'}`}>
                        {sampleAvailability ? 'Available' : 'No'}
                    </div>
                    <div className="text-xs text-gray-500">&nbsp;</div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button onClick={onRequestQuote} className="w-full sm:w-2/3 flex items-center justify-center bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    <MailIcon className="h-4 w-4 mr-2" /> Request Full Quote
                </button>
                 <button onClick={handleCopy} className="w-full sm:w-1/3 flex items-center justify-center bg-brand-secondary hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    {isCopied ? <><ClipboardCheckIcon className="h-4 w-4 mr-2" /> Copied</> : <><ClipboardIcon className="h-4 w-4 mr-2" /> Copy</>}
                </button>
            </div>
        </div>
    );
};

const FactoryBidModal: React.FC<{ bid: FactoryBid; onClose: () => void }> = ({ bid, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const score = deriveSustainabilityScore(bid.sustainability);
  const scoreColor = getScoreColor(score);

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-brand-secondary rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
           <h3 className="text-xl font-bold text-white">{bid.name}</h3>
           <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors" 
            aria-label="Close modal"
          >
             <XMarkIcon className="w-6 h-6" /> 
           </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">EXW Price</p>
              <p className="text-2xl font-bold text-brand-primary">${(bid.price ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Risk Level</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <RiskIcon risk={bid.risk} className="w-5 h-5" />
                <p className="text-lg font-semibold">{bid.risk}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Sustainability</p>
              <p className={`text-lg font-semibold mt-1 ${scoreColor}`}>{score}</p>
            </div>
          </div>
          
          <div className="space-y-4 text-sm">
            {bid.riskSummary && (
                <div>
                    <h4 className="font-semibold text-gray-300 mb-1">Risk Summary:</h4>
                    <p className="text-gray-400 italic">{bid.riskSummary}</p>
                </div>
            )}
            
            {bid.sustainability && (
                <div className="flex items-start text-gray-300">
                    <TreesIcon className="w-4 h-4 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{bid.sustainability}</span>
                </div>
            )}

            {bid.certifications && bid.certifications.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-300 mb-2">Certifications:</h4>
                    <div className="flex flex-wrap gap-2 items-center">
                        {bid.certifications.map(cert => (
                            <span key={cert} className="flex items-center text-xs bg-teal-800/50 text-teal-200 px-2 py-0.5 rounded-full">
                                <BadgeCheckIcon className="w-3 h-3 mr-1" />
                                {cert}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {bid.trustIndicators && bid.trustIndicators.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-300 mb-2">Reliability Indicators:</h4>
                    <div className="space-y-1.5">
                        {bid.trustIndicators.map(indicator => (
                            <div key={indicator.name} className="flex items-center text-xs">
                                {indicator.available ? (
                                    <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                                ) : (
                                    <XCircleIcon className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                                )}
                                <span className={indicator.available ? 'text-gray-300' : 'text-gray-500 line-through'}>
                                    {indicator.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {bid.sourceUrl && (
                <a href={bid.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-brand-primary hover:underline pt-2">
                    <LinkIcon className="w-3 h-3 mr-1.5" /> View Source on B2B Platform
                </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const FactoryBidCard: React.FC<{ bid: FactoryBid; isRecommended: boolean; onSelect: () => void }> = ({ bid, isRecommended, onSelect }) => {
  const score = deriveSustainabilityScore(bid.sustainability);
  const scoreColor = getScoreColor(score);

  return (
    <div 
      className={`bg-brand-dark rounded-lg border transition-all duration-300 p-4 cursor-pointer hover:bg-brand-dark/50 ${isRecommended ? 'border-brand-primary shadow-lg' : 'border-gray-700'}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      {isRecommended && (
        <div className="text-xs font-bold text-brand-primary bg-brand-secondary/50 rounded-full px-3 py-1 inline-block mb-3">
          Recommended for Breakdown
        </div>
      )}
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="font-semibold text-white">{bid.name || 'Unknown Factory'}</p>
          {bid.specialty && (
            <p className="text-xs text-brand-primary/80 bg-brand-secondary/50 rounded-full px-2 py-0.5 inline-block mt-1">
              {bid.specialty}
            </p>
          )}
        </div>
        <p className="text-2xl font-bold text-brand-primary">${(bid.price ?? 0).toFixed(2)}</p>
      </div>
      <div className="flex items-center justify-between mt-3 text-sm">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                  <strong>Risk:</strong>
                  <RiskIcon risk={bid.risk} />
                  <span className="font-semibold">{bid.risk}</span>
              </div>
               <div className="flex items-center gap-1">
                  <strong>Sustainability:</strong>
                  <span className={`font-semibold ${scoreColor}`}>{score}</span>
              </div>
          </div>
          <div className="flex items-center text-gray-400 flex-shrink-0 ml-2">
              <span>View Details</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1.5" />
          </div>
      </div>
    </div>
  );
};

const FbaCalculator: React.FC<{ proposal: ParsedProposal }> = ({ proposal }) => {
    const { ddpPriceTiers, packagingDetails } = proposal;
    const [selectedTier, setSelectedTier] = useState(ddpPriceTiers[0]?.quantity || 0);

    const unitsPerCarton = packagingDetails?.unitsPerCarton || 1;
    const numberOfCartons = Math.ceil(selectedTier / unitsPerCarton);
    const totalCost = (ddpPriceTiers.find(t => t.quantity === selectedTier)?.pricePerUnit || 0) * selectedTier;

    return (
        <div className="bg-brand-dark rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                    <label htmlFor="fba-tier" className="block text-sm font-medium text-gray-300 mb-1">Select Quantity Tier</label>
                    <select
                        id="fba-tier"
                        value={selectedTier}
                        onChange={e => setSelectedTier(Number(e.target.value))}
                        className="w-full bg-brand-secondary border border-gray-600 rounded-md p-2 text-brand-light focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                    >
                        {ddpPriceTiers.map(tier => (
                            <option key={tier.quantity} value={tier.quantity}>{tier.quantity.toLocaleString()} units</option>
                        ))}
                    </select>
                </div>
                <div className="text-center md:text-right">
                    <div className="text-xs text-gray-400">Total Cartons</div>
                    <div className="text-2xl font-bold">{numberOfCartons.toLocaleString()}</div>
                </div>
                <div className="text-center md:text-right">
                    <div className="text-xs text-gray-400">Total DDP Cost</div>
                    <div className="text-2xl font-bold text-brand-primary">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center md:text-left italic">
                * Price includes application of FNSKU labels to each unit and FBA carton labels to each master carton.
            </p>
        </div>
    );
};

const MarginCalculator: React.FC<{ proposal: ParsedProposal }> = ({ proposal }) => {
    const { ddpPriceTiers, packagingOptions } = proposal;
    const [retailPrice, setRetailPrice] = useState('');
    const [selectedPackaging, setSelectedPackaging] = useState<PackagingOption | null>(packagingOptions?.[0] || null);

    const calculations = useMemo(() => {
        const retail = parseFloat(retailPrice);
        if (isNaN(retail) || retail <= 0 || !selectedPackaging) return [];
        
        return ddpPriceTiers.map(tier => {
            const landedCost = tier.pricePerUnit + selectedPackaging.pricePerUnit;
            const margin = ((retail - landedCost) / retail) * 100;
            return {
                quantity: tier.quantity,
                landedCost: landedCost,
                margin: margin,
            };
        });
    }, [retailPrice, selectedPackaging, ddpPriceTiers]);

    return (
        <div className="bg-brand-dark rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="retail-price" className="block text-sm font-medium text-gray-300 mb-1">Target Retail Price ($)</label>
                    <input
                        id="retail-price"
                        type="number"
                        value={retailPrice}
                        onChange={e => setRetailPrice(e.target.value)}
                        className="w-full bg-brand-secondary border border-gray-600 rounded-md p-2 text-brand-light focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                        placeholder="e.g., 9.99"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Packaging Option</label>
                    <div className="flex gap-2 h-10">
                        {packagingOptions.map(opt => (
                            <button
                                key={opt.name}
                                onClick={() => setSelectedPackaging(opt)}
                                className={`w-full text-xs rounded-md border transition-colors ${selectedPackaging?.name === opt.name ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-secondary border-gray-600 hover:border-gray-500'}`}
                            >
                                {opt.name} (+${opt.pricePerUnit.toFixed(2)})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {calculations.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-brand-secondary/50">
                            <tr>
                                <th className="px-4 py-2">Quantity</th>
                                <th className="px-4 py-2 text-right">Total Landed Cost</th>
                                <th className="px-4 py-2 text-right">Est. Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculations.map(calc => (
                                 <tr key={calc.quantity} className="border-b border-gray-700 last:border-b-0">
                                     <td className="px-4 py-2">{calc.quantity.toLocaleString()}</td>
                                     <td className="px-4 py-2 text-right font-mono">${calc.landedCost.toFixed(2)}</td>
                                     <td className={`px-4 py-2 text-right font-mono font-bold ${calc.margin > 50 ? 'text-green-400' : calc.margin > 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                                         {calc.margin.toFixed(1)}%
                                     </td>
                                 </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export const PriceEstimateDisplay: React.FC<PriceEstimateDisplayProps> = ({ proposal, onRequestQuote }) => {
    const { productName, productDescription, specs, demandAnalysis, factoryBids, packagingOptions, nexyAdvantage, ddpPriceTiers, ddpCostBreakdown, logisticsAssumptions, complianceChecks, sources } = proposal;
    const [isCopied, setIsCopied] = useState(false);
    const [selectedBid, setSelectedBid] = useState<FactoryBid | null>(null);
    const [isInsightExpanded, setIsInsightExpanded] = useState(false);
    
    // Price Alert State
    const [alerts, setAlerts] = useState<Record<string, number>>({});
    const [notifications, setNotifications] = useState<string[]>([]);
    const [editingAlert, setEditingAlert] = useState<{ quantity: number; price: string } | null>(null);

    useEffect(() => {
        if (!productName) return;

        // Load alerts from localStorage
        const allAlerts = JSON.parse(localStorage.getItem(PRICE_ALERTS_KEY) || '{}');
        const productAlerts = allAlerts[productName] || {};
        setAlerts(productAlerts);

        // Check for triggered alerts
        const triggered: string[] = [];
        ddpPriceTiers.forEach(tier => {
            const alertPrice = productAlerts[tier.quantity];
            if (alertPrice && tier.pricePerUnit <= alertPrice) {
                triggered.push(`Price for ${tier.quantity.toLocaleString()} units has hit your target of $${alertPrice.toFixed(2)}! Current price: $${tier.pricePerUnit.toFixed(2)}.`);
            }
        });
        setNotifications(triggered);

    }, [proposal, productName, ddpPriceTiers]);
    
    const midTierPrice = ddpPriceTiers.find(p => p.quantity === 1000)?.pricePerUnit?.toFixed(2) || 'N/A';
    
    const allSourceUrls = [...new Set([...(sources.tariff || []), ...(sources.demand || []), ...(sources.compliance || [])])].filter(url => url);

    const chartData = ddpPriceTiers.map(tier => ({
        name: `${tier.quantity / 1000}k`,
        price: tier.pricePerUnit
    }));

    const handleCopyReport = () => {
        if (!proposal) return;
        navigator.clipboard.writeText(JSON.stringify(proposal, null, 2));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    const handleSaveAlert = (quantity: number, priceStr: string) => {
        if (!productName) return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) {
            handleDeleteAlert(quantity); // Clear if invalid
            return;
        }

        const allAlerts = JSON.parse(localStorage.getItem(PRICE_ALERTS_KEY) || '{}');
        if (!allAlerts[productName]) {
            allAlerts[productName] = {};
        }
        allAlerts[productName][quantity] = price;
        localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(allAlerts));
        
        setAlerts(prev => ({ ...prev, [quantity]: price }));
        setEditingAlert(null);
    };

    const handleDeleteAlert = (quantity: number) => {
        if (!productName) return;
        const allAlerts = JSON.parse(localStorage.getItem(PRICE_ALERTS_KEY) || '{}');
        if (allAlerts[productName]) {
            delete allAlerts[productName][quantity];
            if (Object.keys(allAlerts[productName]).length === 0) {
                delete allAlerts[productName];
            }
        }
        localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(allAlerts));

        setAlerts(prev => {
            const newAlerts = { ...prev };
            delete newAlerts[quantity];
            return newAlerts;
        });
        setEditingAlert(null);
    };
    
    const breakdownItems = [
      { label: "Factory Price", value: ddpCostBreakdown.factoryPrice },
      { label: "Freight", value: ddpCostBreakdown.estimatedFreight },
      { label: "Nexy.ai Fee", value: ddpCostBreakdown.nexyFee },
      { label: "Brokerage/ISF", value: ddpCostBreakdown.brokerageAndIsf, tooltip: tooltipDefinitions.brokerageAndIsf },
      { label: "MFN Duty", value: ddpCostBreakdown.mfnDuty, tooltip: tooltipDefinitions.mfnDuty },
      { label: "Sec 301 Duty", value: ddpCostBreakdown.section301Duty, tooltip: tooltipDefinitions.section301Duty, condition: logisticsAssumptions.exportCountry?.toLowerCase() === 'china' },
      { label: "MPF", value: ddpCostBreakdown.mpf, tooltip: tooltipDefinitions.mpf },
      { label: "HMF", value: ddpCostBreakdown.hmf, tooltip: tooltipDefinitions.hmf }
    ];
    
    const insightSnippet = useMemo(() => {
        const insight = demandAnalysis.genAiInsight || '';
        const sentences = insight.match(/[^.!?]+[.!?]+/g) || [];
        return sentences.slice(0, 2).join(' ');
    }, [demandAnalysis.genAiInsight]);


  return (
    <>
    {selectedBid && <FactoryBidModal bid={selectedBid} onClose={() => setSelectedBid(null)} />}
    <div className="space-y-4 text-brand-light animate-fade-in">
        
        {notifications.length > 0 && (
            <div className="mb-6 bg-green-900/50 border border-green-500 text-green-200 p-4 rounded-lg">
                <h3 className="flex items-center font-bold mb-2">
                    <BellAlertIcon className="w-5 h-5 mr-2" />
                    Price Alert Triggered!
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {notifications.map((note, index) => <li key={index}>{note}</li>)}
                </ul>
            </div>
        )}

        <SummaryCard proposal={proposal} onRequestQuote={onRequestQuote} />

        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">{productName || 'Product Estimate'}</h2>
            <p className="text-gray-400 italic mt-1">{productDescription}</p>
            <div className="flex justify-center gap-4 text-xs text-gray-400 mt-2">
                <span>Dims: {specs.dimensions || 'N/A'}</span>
                <span>Weight: {specs.weight || 'N/A'}</span>
                <span>Core: {specs.coreMaterial || 'N/A'}</span>
            </div>
        </div>
        
        <Section title="US Market Snapshot" icon={<DemandIcon className="w-6 h-6" />} date={new Date().toLocaleDateString()}>
            <div className="pt-2">
                <p className="text-sm text-gray-300 italic">
                    {isInsightExpanded ? demandAnalysis.genAiInsight : insightSnippet}
                    {(demandAnalysis.genAiInsight?.length ?? 0) > insightSnippet.length && (
                        <button onClick={() => setIsInsightExpanded(!isInsightExpanded)} className="text-brand-primary hover:underline ml-2 text-xs">
                            {isInsightExpanded ? 'Read Less' : 'Read More'}
                        </button>
                    )}
                </p>
            </div>
        </Section>
        
        <Section title="Profitability Calculator" icon={<CalculatorIcon className="w-6 h-6" />}>
          <MarginCalculator proposal={proposal} />
        </Section>

        <Section title="Factory Bids (EXW)" icon={<FactoryIcon className="w-6 h-6" />}>
          <div className="space-y-4">
            {factoryBids.map((bid, index) => {
              const isRecommended = bid.price === ddpCostBreakdown.factoryPrice;
              return (
                <FactoryBidCard 
                  key={index} 
                  bid={bid} 
                  isRecommended={isRecommended} 
                  onSelect={() => setSelectedBid(bid)}
                />
              );
            })}
          </div>
        </Section>
        
        <Section title="DDP Price Tiers" icon={<TagIcon className="w-6 h-6" />}>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-brand-secondary/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Quantity</th>
                            <th scope="col" className="px-6 py-3 text-right">Price Per Unit</th>
                            <th scope="col" className="px-4 py-3 text-center">Alert</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ddpPriceTiers.map(tier => {
                            const hasAlert = alerts[tier.quantity] !== undefined;
                            const isEditing = editingAlert?.quantity === tier.quantity;

                            return (
                                <tr key={tier.quantity} className="border-b border-gray-700 last:border-b-0 hover:bg-brand-secondary/30">
                                    <td className="px-6 py-4 font-medium whitespace-nowrap">{tier.quantity.toLocaleString()} units</td>
                                    <td className="px-6 py-4 text-right font-mono text-lg text-brand-primary font-bold">${(tier.pricePerUnit ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-gray-400">$</span>
                                                <input
                                                    type="number"
                                                    value={editingAlert.price}
                                                    onChange={e => setEditingAlert({ ...editingAlert, price: e.target.value })}
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveAlert(tier.quantity, editingAlert.price)}
                                                    className="w-20 bg-brand-dark border border-gray-600 rounded-md px-2 py-1 text-brand-light focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                                                    placeholder="Target"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveAlert(tier.quantity, editingAlert.price)} className="p-1 text-green-400 hover:text-green-300"><CheckIcon className="w-5 h-5" /></button>
                                                <button onClick={() => setEditingAlert(null)} className="p-1 text-gray-400 hover:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
                                            </div>
                                        ) : (
                                            <Tooltip content={hasAlert ? `Alert set for $${alerts[tier.quantity].toFixed(2)}` : 'Set a price alert'}>
                                                <button
                                                    onClick={() => setEditingAlert({ quantity: tier.quantity, price: alerts[tier.quantity]?.toString() || '' })}
                                                    className={`p-1.5 rounded-full transition-colors ${hasAlert ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}
                                                >
                                                    <BellIcon className="w-5 h-5" />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#393E46" />
                        <XAxis dataKey="name" stroke="#88898a" fontSize={12} />
                        <YAxis stroke="#88898a" fontSize={12} tickFormatter={(value) => `$${value}`} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#222831', border: '1px solid #393E46' }} cursor={{ fill: 'rgba(0, 173, 181, 0.2)' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']} />
                        <Bar dataKey="price" fill="#00ADB5">
                           <LabelList dataKey="price" position="top" fill="#EEEEEE" fontSize={12} formatter={(value: number) => `$${value.toFixed(2)}`} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Section>
        
        <Section title="FBA Logistics Calculator" icon={<PackageIcon className="w-6 h-6" />}>
            <FbaCalculator proposal={proposal} />
        </Section>
        
        {/* --- CALL TO ACTION --- */}
        <div className="bg-brand-primary/20 border border-brand-primary p-6 my-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Ready for the Next Step?</h3>
            <p className="text-gray-300 mb-4">Lock in your pricing and let our experts handle the rest.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                 <button 
                    onClick={handleCopyReport}
                    className="flex items-center justify-center bg-brand-secondary hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                  >
                    {isCopied ? (
                        <>
                            <ClipboardCheckIcon className="h-5 w-5 mr-2" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="h-5 w-5 mr-2" />
                            Copy Full Report (JSON)
                        </>
                    )}
                 </button>
                 <button 
                    onClick={onRequestQuote}
                    className="flex items-center justify-center bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 rounded-lg transition duration-300 w-full sm:w-auto"
                  >
                    <MailIcon className="h-5 w-5 mr-2" />
                    Contact Sourcing Agent
                 </button>
            </div>
        </div>
        
        {/* --- SUPPORTING DETAILS --- */}
        <div className="pt-4 border-t border-gray-700">
            <h3 className="text-center text-gray-500 text-sm uppercase font-semibold mb-4">Supporting Details</h3>
            
            <Section title="Operations" icon={<ShieldCheckIcon className="w-6 h-6" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Vendor Onboarding Packet</h4>
                        <ul className="space-y-1.5 text-sm">
                            {['W-9 or W-8BEN', 'Certificate of Insurance (COI)', 'Company Information Form'].map(item => (
                                <li key={item} className="flex items-center text-gray-400"><CheckCircleIcon className="w-4 h-4 mr-2 text-green-400"/>{item}</li>
                            ))}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">Label & Packaging Approval</h4>
                         <p className="text-sm text-gray-400 mb-3">Our team will provide digital proofs for your approval before any production begins.</p>
                        <button onClick={onRequestQuote} className="text-sm flex items-center justify-center bg-brand-secondary hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                             Request Label Proof
                        </button>
                    </div>
                </div>
            </Section>

            <Section title="DDP Cost Breakdown" icon={<SpecsIcon className="w-6 h-6" />}>
                <p className="text-sm text-gray-400 text-center mb-4">(Based on 1,000 unit tier and recommended factory)</p>
                <div className="bg-brand-dark rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                     {breakdownItems.map(item => (
                        (item.condition === undefined || item.condition) &&
                        <DataPoint 
                            key={item.label}
                            label={item.label}
                            value={`$${(item.value ?? 0).toFixed(2)}`}
                            tooltipContent={item.tooltip}
                        />
                    ))}
                </div>
                 <div className="mt-4 text-center">
                    <DataPoint label="HTS Code" value={ddpCostBreakdown.htsCode} tooltipContent={tooltipDefinitions.htsCode} />
                </div>
            </Section>

            <Section title="Logistics Assumptions" icon={<ShipIcon className="w-6 h-6" />}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <DataPoint label="Export Country" value={logisticsAssumptions.exportCountry} />
                    <DataPoint label="Incoterm" value={logisticsAssumptions.incoterm} tooltipContent={tooltipDefinitions.incoterm} />
                    <DataPoint label="Port of Loading" value={logisticsAssumptions.portOfLoading} />
                    <DataPoint label="Port of Discharge" value={logisticsAssumptions.portOfDischarge} />
                    <DataPoint label="Shipping Mode" value={logisticsAssumptions.shippingMode} />
                    <DataPoint label="Carton Estimate" value={logisticsAssumptions.cartonEstimate} />
                </div>
            </Section>

            <Section title="Compliance & Safety" icon={<ChecklistIcon className="w-6 h-6" />}>
                 <div className="space-y-3">
                    {complianceChecks.map((check, index) => (
                        <div key={index} className="flex items-start text-sm">
                             <InfoIcon className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0"/>
                             <div className="ml-3">
                                <h4 className="font-semibold">{check.name} {check.applicable ? '' : '(Not Applicable)'}</h4>
                                <p className="text-gray-400">{check.details}</p>
                             </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Packaging Options" icon={<CustomizeIcon className="w-6 h-6" />}>
              <ul className="list-disc list-inside text-sm space-y-2">
                  {packagingOptions.map((opt, index) => 
                    <li key={index}>
                      <strong>{opt.name} (+${opt.pricePerUnit.toFixed(2)}):</strong>
                      <span className="text-gray-400 ml-1">{opt.description}</span>
                    </li>
                  )}
              </ul>
            </Section>

            <Section title="Data Sources" icon={<SourceIcon className="w-6 h-6" />}>
              <div className="text-sm space-y-1">
                {allSourceUrls.map((url, index) => (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-brand-primary hover:underline">
                        <LinkIcon className="w-3 h-3 mr-1" /> 
                        <span className="truncate">{url}</span>
                     </a>
                ))}
              </div>
            </Section>
        </div>
    </div>
    </>
  );
};
