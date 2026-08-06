/**
 * Generates the placeholder documents used by the Phase 1 mock data.
 *
 * These are real, valid single-page PDFs (correct xref offsets) so the
 * in-app document preview genuinely renders instead of showing a broken frame.
 * In Phase 2 these are replaced by signed Supabase Storage URLs.
 *
 * Run: node scripts/make-sample-docs.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "docs");
mkdirSync(outDir, { recursive: true });

/** Escape a string for a PDF literal string. */
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/**
 * Build a one-page A4 PDF from an array of lines.
 * Each line: { text, size, bold, gap } — gap is extra leading before the line.
 */
function buildPdf(lines) {
  const left = 64;
  let y = 782;
  const ops = [];

  for (const line of lines) {
    y -= (line.gap ?? 0) + (line.size ?? 11) + 4;
    if (line.rule) {
      ops.push(`0.72 0.75 0.80 RG 0.7 w ${left} ${y + 8} m 531 ${y + 8} l S`);
      continue;
    }
    const grey = line.grey ?? 0;
    ops.push(
      `BT /${line.bold ? "F1" : "F2"} ${line.size ?? 11} Tf ` +
        `${grey} ${grey} ${grey} rg ` +
        `${left} ${y} Td (${esc(line.text ?? "")}) Tj ET`,
    );
  }

  const content = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

const letterhead = (title) => [
  { text: "MCN ASSET SDN BHD", size: 16, bold: true },
  { text: "Registration No. 202401xxxxxx (1xxxxxx-A)", size: 8.5, grey: 0.45 },
  { text: "Kuala Lumpur, Malaysia", size: 8.5, grey: 0.45 },
  { rule: true, gap: 6 },
  { text: title, size: 13, bold: true, gap: 14 },
];

const footer = [
  { rule: true, gap: 26 },
  {
    text: "SAMPLE DOCUMENT - placeholder generated for the MCN Asset HQ dashboard prototype.",
    size: 8,
    grey: 0.5,
    gap: 2,
  },
  {
    text: "Not a real instrument. Replace with the signed original before use.",
    size: 8,
    grey: 0.5,
  },
];

const docs = {
  "official-letter.pdf": [
    ...letterhead("LETTER OF OFFER - FACTORY COSIF FACILITY"),
    { text: "Date: 12 May 2026", size: 10, gap: 6 },
    { text: "To: The Board of Directors", size: 10, gap: 8 },
    { text: "Dear Sirs,", size: 10, gap: 12 },
    {
      text: "We are pleased to confirm the approval of the Cosif facility in the amount of",
      size: 10,
      gap: 8,
    },
    { text: "RM4,000,000.00 (Ringgit Malaysia Four Million only), subject to the terms", size: 10 },
    { text: "and conditions set out in the attached schedule.", size: 10 },
    {
      text: "Of the approved facility, RM1,000,000.00 shall be invested into MCN Asset",
      size: 10,
      gap: 10,
    },
    { text: "HQ in accordance with the participation agreement.", size: 10 },
    { text: "Expected disbursement window: 2 to 3 months from the date hereof.", size: 10, gap: 10 },
    { text: "Yours faithfully,", size: 10, gap: 20 },
    { text: "Authorised Signatory", size: 10, bold: true, gap: 22 },
    { text: "MCN Asset Sdn Bhd", size: 9, grey: 0.4 },
    ...footer,
  ],
  "participation-agreement.pdf": [
    ...letterhead("PARTICIPATION AGREEMENT"),
    { text: "Clause 1 - Subscription", size: 11, bold: true, gap: 10 },
    {
      text: "The Participant agrees to subscribe for the interest described in Schedule 1",
      size: 10,
      gap: 6,
    },
    { text: "and to remit the subscription sum to the account nominated by the Company.", size: 10 },
    { text: "Clause 2 - Application of Funds", size: 11, bold: true, gap: 14 },
    {
      text: "Funds received shall be applied solely toward the capital programme of",
      size: 10,
      gap: 6,
    },
    { text: "MCN Asset Sdn Bhd and shall be recorded in the capital register.", size: 10 },
    { text: "Clause 3 - Introducer Fees", size: 11, bold: true, gap: 14 },
    {
      text: "An introducer fee of RM5,000.00 becomes payable upon disbursement, and a",
      size: 10,
      gap: 6,
    },
    { text: "further RM5,000.00 upon the investment being received by the Company.", size: 10 },
    { text: "Executed as an agreement.", size: 10, gap: 18 },
    { text: "Participant                                    Company", size: 10, bold: true, gap: 20 },
    ...footer,
  ],
  "bank-slip.pdf": [
    ...letterhead("REMITTANCE ADVICE"),
    { text: "Transaction Reference: MCN/2026/TT/00418", size: 10, gap: 8 },
    { text: "Value Date: 3 June 2026", size: 10, gap: 6 },
    { text: "Beneficiary: MCN ASSET SDN BHD", size: 10, gap: 6 },
    { text: "Beneficiary Account: xxxx-xxxx-4471", size: 10, gap: 6 },
    { text: "Amount: RM1,000,000.00", size: 12, bold: true, gap: 10 },
    { text: "Status: SUCCESSFUL", size: 10, bold: true, gap: 8 },
    { rule: true, gap: 12 },
    {
      text: "This advice is computer generated and does not require a signature.",
      size: 9,
      grey: 0.4,
      gap: 6,
    },
    ...footer,
  ],
  "company-profile.pdf": [
    ...letterhead("COMPANY PROFILE SUMMARY"),
    { text: "Business Overview", size: 11, bold: true, gap: 10 },
    {
      text: "The company operates within the manufacturing and industrial services",
      size: 10,
      gap: 6,
    },
    { text: "sector with established regional distribution.", size: 10 },
    { text: "Indicative Financials", size: 11, bold: true, gap: 14 },
    { text: "Revenue (FY2025)                      RM 24,600,000", size: 10, gap: 6 },
    { text: "Profit After Tax (FY2025)             RM  1,150,000", size: 10, gap: 4 },
    { text: "Net Assets                            RM  9,300,000", size: 10, gap: 4 },
    { text: "Listing Rationale", size: 11, bold: true, gap: 14 },
    {
      text: "Consolidation into the group vehicle to contribute toward the RM6,000,000",
      size: 10,
      gap: 6,
    },
    { text: "group profit-after-tax threshold required for the Nasdaq listing.", size: 10 },
    ...footer,
  ],
  "identity-document.pdf": [
    ...letterhead("KNOW-YOUR-CUSTOMER RECORD"),
    { text: "Member Reference: MDNA/2026/0182", size: 10, gap: 8 },
    { text: "Identification: xxxxxx-xx-xxxx", size: 10, gap: 6 },
    { text: "Package: Senior Co-Living - RM500,000", size: 10, gap: 6 },
    { text: "HQ Investment Portion: RM50,000", size: 10, gap: 6 },
    { text: "Verification Status: VERIFIED", size: 10, bold: true, gap: 10 },
    { rule: true, gap: 12 },
    {
      text: "Personal identifiers are masked in this sample. Live records are stored in a",
      size: 9,
      grey: 0.4,
      gap: 6,
    },
    { text: "private bucket with row-level access control.", size: 9, grey: 0.4 },
    ...footer,
  ],
};

for (const [name, lines] of Object.entries(docs)) {
  const buf = buildPdf(lines);
  writeFileSync(join(outDir, name), buf);
  console.log(`wrote public/docs/${name} (${buf.length} bytes)`);
}
