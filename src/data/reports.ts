// PLACEHOLDER CONTENT — no real technical reports exist yet. Replace `fileUrl`
// with real published PDFs once available; until then entries render as
// "Coming soon".

export type TechnicalReport = {
  year: number;
  title: string;
  fileUrl: string | null;
};

export const TECHNICAL_REPORTS: TechnicalReport[] = [
  { year: 2027, title: "2027 Competition Season Technical Report", fileUrl: null },
  { year: 2026, title: "2026 Competition Season Technical Report", fileUrl: null },
];
