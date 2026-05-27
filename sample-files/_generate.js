// One-shot helper: writes a handful of small but valid PDF/TXT/CSV files
// into this folder so the Files page has realistic real-estate documents
// to upload during testing. Delete this script once you don't need it.

const fs = require("fs");
const path = require("path");

const dir = __dirname;

function escapePdf(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(title, lines) {
  const tj = lines.map((l) => `(${escapePdf(l)}) Tj T*`).join("\n");
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 770 Td",
    `(${escapePdf(title)}) Tj`,
    "/F1 11 Tf",
    "0 -28 TL",
    tj,
    "ET",
  ].join("\n");
  const streamBuf = Buffer.from(content, "latin1");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${streamBuf.length} >>\nstream\n${streamBuf.toString("latin1")}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const docs = [
  {
    name: "skyline-heights-brochure.pdf",
    title: "Skyline Heights - Brochure",
    lines: [
      "Premium 2 & 3 BHK Apartments",
      "Possession: Dec 2026",
      "Price range: Rs 85 L - Rs 1.6 Cr",
      "RERA: P51800012345",
      "Amenities: Clubhouse, Pool, Gym, Kids park",
      "Location: Wakad, Pune",
    ],
  },
  {
    name: "price-list-q2-2026.pdf",
    title: "Price List - Q2 2026",
    lines: [
      "Skyline Heights - Tower A",
      "2 BHK 950 sqft  Rs 85 L (all in)",
      "2 BHK 1050 sqft Rs 95 L",
      "3 BHK 1450 sqft Rs 1.3 Cr",
      "3 BHK 1620 sqft Rs 1.55 Cr",
      "* Floor rise Rs 50/sqft per floor",
      "* GST and Stamp Duty extra",
    ],
  },
  {
    name: "booking-form-blank.pdf",
    title: "Booking Application Form",
    lines: [
      "Customer Name: __________________________",
      "Phone: __________________________________",
      "Email: __________________________________",
      "Project / Unit: __________________________",
      "Token Amount: ___________________________",
      "Mode of Payment: ________________________",
      "Signature: ______________________________",
    ],
  },
  {
    name: "kyc-checklist.pdf",
    title: "KYC Document Checklist",
    lines: [
      "1. PAN card (mandatory)",
      "2. Aadhaar card",
      "3. Address proof (utility bill / passport)",
      "4. Latest 3 months bank statement",
      "5. Salary slips / ITR (last 2 years)",
      "6. Passport size photo",
      "7. Form 16 if salaried",
    ],
  },
  {
    name: "agreement-template.pdf",
    title: "Agreement to Sell - Template",
    lines: [
      "THIS AGREEMENT made on ____ day of ____ 2026",
      "BETWEEN",
      "Seller: ____________________________________",
      "AND",
      "Purchaser: _________________________________",
      "WHEREAS the Seller is the absolute owner...",
      "(Standard clauses follow)",
    ],
  },
  {
    name: "floor-plan-2bhk.pdf",
    title: "Skyline Heights - 2 BHK Floor Plan",
    lines: [
      "Tower A - Type 2A",
      "Carpet Area: 712 sqft",
      "Built-up Area: 950 sqft",
      "Living: 12 x 18",
      "Kitchen: 8 x 10",
      "Bed 1: 11 x 13",
      "Bed 2: 10 x 12",
      "2 Balconies",
    ],
  },
];

const written = [];
for (const d of docs) {
  const buf = buildPdf(d.title, d.lines);
  fs.writeFileSync(path.join(dir, d.name), buf);
  written.push([d.name, buf.length]);
}

fs.writeFileSync(
  path.join(dir, "commission-policy.txt"),
  [
    "Internal Commission Policy",
    "==========================",
    "Agents: 1.5% of booking value on closure (status = Booked).",
    "Managers: override of 0.25% on team bookings.",
    "Clawback: full clawback if booking is cancelled within 60 days.",
    "",
  ].join("\n"),
);
written.push([
  "commission-policy.txt",
  fs.statSync(path.join(dir, "commission-policy.txt")).size,
]);

fs.writeFileSync(
  path.join(dir, "unit-availability.csv"),
  [
    "unit,type,carpet_sqft,floor,price_lacs,status",
    "A-1201,2BHK,712,12,85,available",
    "A-1202,2BHK,712,12,85,blocked",
    "A-1401,3BHK,1108,14,130,available",
    "A-1402,3BHK,1108,14,130,sold",
    "B-0501,2BHK,712,5,78,available",
    "B-0801,3BHK,1108,8,125,available",
    "",
  ].join("\n"),
);
written.push([
  "unit-availability.csv",
  fs.statSync(path.join(dir, "unit-availability.csv")).size,
]);

console.log("Wrote to:", dir);
for (const [n, s] of written) console.log(" ", n.padEnd(36), s, "bytes");
