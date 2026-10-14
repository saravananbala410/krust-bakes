export type GstBreakdown = {
  inclusiveTotal: number;
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export function calculateInclusiveGst(
  inclusiveTotal: number,
  rate: number,
  interstate = false,
): GstBreakdown {
  const taxableValue = inclusiveTotal / (1 + rate / 100);
  const gstAmount = inclusiveTotal - taxableValue;
  const split = gstAmount / 2;

  return {
    inclusiveTotal: round(inclusiveTotal),
    taxableValue: round(taxableValue),
    gstAmount: round(gstAmount),
    cgst: interstate ? 0 : round(split),
    sgst: interstate ? 0 : round(split),
    igst: interstate ? round(gstAmount) : 0,
  };
}

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
