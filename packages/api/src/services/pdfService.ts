import PDFDocument from 'pdfkit';
import type { Company, Customer, Invoice, Quote } from '@glaszetter/shared';

const formatCurrency = (amount: number): string =>
  `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date?: Date): string =>
  date ? new Date(date).toLocaleDateString('nl-NL') : '-';

interface DocumentInfo {
  title: string;
  number: string;
  dateLabel: string;
  dateValue?: Date;
  vatRate: number;
  notes?: string;
  lines: { description: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  vatAmount: number;
  total: number;
}

const renderDocument = (
  doc: PDFKit.PDFDocument,
  company: Company,
  customer: Customer,
  info: DocumentInfo
): void => {
  doc.fontSize(20).text(company.name, { continued: false });
  doc.fontSize(9).fillColor('#555');
  if (company.address) doc.text(company.address);
  if (company.postalCode || company.city) doc.text(`${company.postalCode ?? ''} ${company.city ?? ''}`.trim());
  if (company.phone) doc.text(`Tel: ${company.phone}`);
  if (company.email) doc.text(`E-mail: ${company.email}`);
  if (company.taxId) doc.text(`BTW-nummer: ${company.taxId}`);
  if (company.iban) doc.text(`IBAN: ${company.iban}`);
  doc.fillColor('#000');

  doc.moveDown(2);
  doc.fontSize(16).text(info.title);
  doc.fontSize(10);
  doc.text(`Nummer: ${info.number}`);
  doc.text(`Datum: ${formatDate(new Date())}`);
  doc.text(`${info.dateLabel}: ${formatDate(info.dateValue)}`);

  doc.moveDown();
  doc.fontSize(11).text('Klant');
  doc.fontSize(10);
  doc.text(customer.name);
  if (customer.address) doc.text(customer.address);
  if (customer.postalCode || customer.city) {
    doc.text(`${customer.postalCode ?? ''} ${customer.city ?? ''}`.trim());
  }

  doc.moveDown(1.5);

  const tableTop = doc.y;
  doc.fontSize(10).text('Omschrijving', 50, tableTop, { width: 250 });
  doc.text('Aantal', 300, tableTop, { width: 60, align: 'right' });
  doc.text('Prijs', 360, tableTop, { width: 80, align: 'right' });
  doc.text('Totaal', 440, tableTop, { width: 100, align: 'right' });
  doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

  let y = tableTop + 22;
  for (const line of info.lines) {
    const lineTotal = line.quantity * line.unitPrice;
    doc.fontSize(10);
    doc.text(line.description, 50, y, { width: 250 });
    doc.text(String(line.quantity), 300, y, { width: 60, align: 'right' });
    doc.text(formatCurrency(line.unitPrice), 360, y, { width: 80, align: 'right' });
    doc.text(formatCurrency(lineTotal), 440, y, { width: 100, align: 'right' });
    y += 20;
  }

  doc.moveTo(50, y + 5).lineTo(540, y + 5).stroke();
  y += 15;

  doc.text('Subtotaal', 360, y, { width: 80, align: 'right' });
  doc.text(formatCurrency(info.subtotal), 440, y, { width: 100, align: 'right' });
  y += 18;
  doc.text(`BTW (${info.vatRate}%)`, 360, y, { width: 80, align: 'right' });
  doc.text(formatCurrency(info.vatAmount), 440, y, { width: 100, align: 'right' });
  y += 18;
  doc.fontSize(11).text('Totaal', 360, y, { width: 80, align: 'right' });
  doc.text(formatCurrency(info.total), 440, y, { width: 100, align: 'right' });

  if (info.notes) {
    doc.moveDown(3);
    doc.fontSize(10).text('Notities', 50);
    doc.fontSize(9).fillColor('#555').text(info.notes, 50, doc.y, { width: 490 });
  }
};

export const generateQuotePdf = (
  quote: Quote,
  company: Company,
  customer: Customer
): PDFKit.PDFDocument => {
  const doc = new PDFDocument({ margin: 50 });
  renderDocument(doc, company, customer, {
    title: `Offerte ${quote.quoteNumber}`,
    number: quote.quoteNumber,
    dateLabel: 'Geldig tot',
    dateValue: quote.validUntil,
    vatRate: quote.vatRate,
    notes: quote.notes,
    lines: quote.lines,
    subtotal: quote.subtotal,
    vatAmount: quote.vatAmount,
    total: quote.total,
  });
  doc.end();
  return doc;
};

export const generateInvoicePdf = (
  invoice: Invoice,
  company: Company,
  customer: Customer
): PDFKit.PDFDocument => {
  const doc = new PDFDocument({ margin: 50 });
  renderDocument(doc, company, customer, {
    title: `Factuur ${invoice.invoiceNumber}`,
    number: invoice.invoiceNumber,
    dateLabel: 'Vervaldatum',
    dateValue: invoice.dueDate,
    vatRate: invoice.vatRate,
    notes: invoice.notes,
    lines: invoice.lines,
    subtotal: invoice.subtotal,
    vatAmount: invoice.vatAmount,
    total: invoice.total,
  });
  doc.end();
  return doc;
};
