export interface TrustIndicator {
  name: string;
  available: boolean;
}

export interface NexyAdvantage {
  title: string;
  description: string;
}

export interface DdpPriceTier {
  quantity: number;
  pricePerUnit: number;
}

export interface DdpCostBreakdown {
  htsCode: string | null;
  factoryPrice: number | null;

  estimatedFreight: number | null;
  mfnDuty: number | null;
  section301Duty: number | null;
  mpf: number | null;
  hmf: number | null;
  brokerageAndIsf: number | null;
  nexyFee: number | null;
}

export interface LogisticsAssumptions {
  exportCountry: string | null;
  incoterm: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  shippingMode: string | null;
  cartonEstimate: string | null;
}

export interface ComplianceCheck {
  name: string;
  details: string;
  applicable: boolean;
}

export interface Spec {
  dimensions: string | null;
  weight: string | null;
  coreMaterial: string | null;
  features: string[];
}

export interface DemandAnalysis {
  usMarketDemand: 'High' | 'Medium' | 'Low' | null;
  competitionLevel: 'Very High' | 'High' | 'Medium' | 'Low' | null;
  genAiInsight: string | null;
  marketSize: string | null;
  competitorBenchmarks: string[];
  salesForecast: string | null;
}

export interface FactoryBid {
  name: string;
  price: number | null;
  specialty: string | null;
  risk: string | null;
  riskSummary: string | null;
  sustainability: string | null;
  certifications: string[];
  trustIndicators: TrustIndicator[];
  sourceUrl: string | null;
}

export interface Sources {
  tariff: string[];
  demand: string[];
  compliance: string[];
}

export interface PackagingOption {
  name: string;
  description: string;
  pricePerUnit: number;
}

export interface PackagingDetails {
  unitsPerCarton: number | null;
  cartonDimensions: string | null;
  cartonWeight: string | null;
}


export interface ParsedProposal {
  productName: string | null;
  productDescription: string | null;
  minimumOrderQuantity: number | null;
  leadTime: string | null;
  sampleAvailability: boolean | null;
  specs: Spec;
  demandAnalysis: DemandAnalysis;
  factoryBids: FactoryBid[];
  packagingOptions: PackagingOption[];
  packagingDetails: PackagingDetails | null;
  nexyAdvantage: NexyAdvantage[];
  ddpPriceTiers: DdpPriceTier[];
  logisticsAssumptions: LogisticsAssumptions;
  ddpCostBreakdown: DdpCostBreakdown;
  complianceChecks: ComplianceCheck[];
  sources: Sources;
}

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface HistoryItem {
  id: string;
  productName: string | null;
  proposal: ParsedProposal;
  createdAt: string;
  priority: PriorityLevel;
}

export interface ImageQuality {
  isLoading: boolean;
  score?: number;
  rating?: 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Error';
  feedback?: string;
}
