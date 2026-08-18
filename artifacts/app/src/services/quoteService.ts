import { quoteRepository } from '../repositories/quoteRepository';

export interface QuoteCalculationInput {
  productType?: string;
  unitType?: string;
  basePrice: number; // Ex-Showroom / Base Price
  floorRise?: number; // Optional Floor Rise or Model Variant Upgrade
  plcCharges?: number; // Location / Color Premium
  parkingCharges?: number; // Registration / RTO / Accessories
  insuranceCharges?: number; // Comprehensive Auto Insurance
  warrantyCharges?: number; // Extended Warranty / AMC Service Pack
  discountPercentage?: number;
  currency?: 'INR' | 'USD' | 'AED' | 'GBP' | 'EUR';
  gstRate?: number;
}

export interface QuoteBreakdown {
  basePrice: number;
  floorRise: number;
  plcCharges: number;
  parkingCharges: number;
  insuranceCharges: number;
  warrantyCharges: number;
  discountAmount: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  formattedTotal: string;
  requiresManagerApproval: boolean;
  approvalStatus: 'Approved' | 'Pending_Manager_Approval' | 'Pending_VP_Approval';
}

const FX_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  AED: 0.044,
  GBP: 0.0095,
  EUR: 0.011,
};

export const quoteService = {
  calculateQuote(input: QuoteCalculationInput): QuoteBreakdown {
    const floorRise = input.floorRise || 0;
    const plcCharges = input.plcCharges || 0;
    const parkingCharges = input.parkingCharges || 0;
    const insuranceCharges = input.insuranceCharges || 0;
    const warrantyCharges = input.warrantyCharges || 0;

    const rawSubtotal =
      input.basePrice + floorRise + plcCharges + parkingCharges + insuranceCharges + warrantyCharges;
    const discountPct = input.discountPercentage || 0;
    const discountAmount = rawSubtotal * (discountPct / 100);
    const subtotal = rawSubtotal - discountAmount;

    const gstAmount = subtotal * (input.gstRate ?? 0.05);
    const totalAmountINR = subtotal + gstAmount;

    const curr = input.currency || 'INR';
    const fxRate = FX_RATES[curr] || 1;
    const finalAmount = totalAmountINR * fxRate;

    const formattedTotal = new Intl.NumberFormat(curr === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(finalAmount);

    // SAP Deal Desk Discount Threshold Check
    let requiresManagerApproval = false;
    let approvalStatus: QuoteBreakdown['approvalStatus'] = 'Approved';

    if (discountPct > 10) {
      requiresManagerApproval = true;
      approvalStatus = discountPct > 15 ? 'Pending_VP_Approval' : 'Pending_Manager_Approval';
    }

    return {
      basePrice: input.basePrice,
      floorRise,
      plcCharges,
      parkingCharges,
      insuranceCharges,
      warrantyCharges,
      discountAmount,
      subtotal,
      gstAmount,
      totalAmount: finalAmount,
      currency: curr,
      formattedTotal,
      requiresManagerApproval,
      approvalStatus,
    };
  },

  async generatePdfQuote(input: QuoteCalculationInput) {
    const breakdown = this.calculateQuote(input);
    return await quoteRepository.saveRawQuote({
      input,
      breakdown,
      generatedAt: new Date().toISOString(),
    });
  },
};
