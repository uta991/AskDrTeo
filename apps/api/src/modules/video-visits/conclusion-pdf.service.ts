import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatTbilisi } from '@/common/utils/tbilisi-time';

/**
 * ექიმის დასკვნა PDF-ად.
 *
 * სამი ბლოკი: ვინ (პაციენტი და ექიმი), რა (დიაგნოზი ახსნით) და
 * რა ვქნათ (დანიშნულება). ეს თანმიმდევრობა შემთხვევითი არაა —
 * ოჯახი დოკუმენტს ზუსტად ამ კითხვებით კითხულობს.
 *
 * ქართული შრიფტი პროექტშივე დევს: სისტემურ შრიფტებზე დაყრდნობა
 * Railway-ის Linux-ზე ცარიელ კვადრატებს დახატავდა.
 */

const ASSETS = join(process.cwd(), 'assets');
const REGULAR = join(ASSETS, 'fonts', 'NotoSansGeorgian-Regular.ttf');
const BOLD = join(ASSETS, 'fonts', 'NotoSansGeorgian-Bold.ttf');
const DOCTOR_PHOTO = join(ASSETS, 'images', 'doctor.png');

/** ღია ცისფერი აქცენტად, დანარჩენი მშვიდი — დოკუმენტი ჭრელი არ უნდა იყოს. */
const BLUE = '#6FB6D9';
const BLUE_SOFT = '#EAF4FA';
const BLUE_DEEP = '#3D7E9B';
const INK = '#1a1a1a';
const MUTED = '#6b6b6b';
const LINE = '#dfe7ec';

export interface ConclusionData {
  visitDate: Date;
  concludedAt: Date | null;
  parentName: string;
  parentPhone: string | null;
  /** „დედა" / „მამა" / „მშობელი" — ანგარიშის მიხედვით */
  parentRoleLabel: string;
  childName: string | null;
  childBirthDate: Date | null;
  doctorName: string;
  diagnosis: string;
  diagnosisNote: string | null;
  prescription: string;
  weightKg: number | null;
  heightCm: number | null;
}

@Injectable()
export class ConclusionPdfService {
  /** მზა PDF ერთ ბუფერად — ფაილად შენახვა არ გვჭირდება. */
  async render(data: ConclusionData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });

    doc.registerFont('ka', REGULAR);
    doc.registerFont('ka-bold', BOLD);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    this.header(doc, data);
    this.patientBlock(doc, data);
    this.diagnosisBlock(doc, data);
    this.prescriptionBlock(doc, data);
    this.footer(doc);

    doc.end();
    return done;
  }

  // ─── თავსართი ────────────────────────────────────────────────────

  private header(doc: PDFKit.PDFDocument, data: ConclusionData): void {
    const { left, width } = bounds(doc);

    doc.rect(0, 0, doc.page.width, 96).fill(BLUE_SOFT);

    doc.font('ka-bold').fontSize(21).fillColor(BLUE_DEEP).text('AskDrTeo', left, 28);
    doc
      .font('ka')
      .fontSize(10)
      .fillColor(MUTED)
      .text('ონლაინ პედიატრიული პლატფორმა · askdrteo.com', left, 55);

    // ექიმის ფოტო — დოკუმენტს ხელს აწერს ადამიანი და არა სისტემა.
    // ოდნავ ზემოთაა, რომ სახელი ცისფერ ზოლს არ სცდებოდეს.
    const photoSize = 50;
    const photoY = 20;
    const photoX = left + width - photoSize;

    if (existsSync(DOCTOR_PHOTO)) {
      doc.save();
      doc
        .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
        .clip();
      doc.image(DOCTOR_PHOTO, photoX, photoY, { width: photoSize, height: photoSize });
      doc.restore();

      doc
        .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
        .lineWidth(1.5)
        .strokeColor(BLUE)
        .stroke();
    }

    doc
      .font('ka-bold')
      .fontSize(10)
      .fillColor(INK)
      .text(`პედიატრი ${data.doctorName}`, left, photoY + photoSize + 4, {
        width: width - photoSize - 12,
        align: 'right',
      });

    doc.y = 118;
  }

  // ─── 1. პაციენტი ─────────────────────────────────────────────────

  private patientBlock(doc: PDFKit.PDFDocument, data: ConclusionData): void {
    this.blockTitle(doc, 'პაციენტი');

    const rows: [string, string][] = [
      ['სახელი და გვარი', data.childName ?? '—'],
      ['ასაკი', data.childBirthDate ? childAge(data.childBirthDate) : '—'],
      ['სიმაღლე', data.heightCm ? `${data.heightCm} სმ` : '—'],
      ['წონა', data.weightKg ? `${data.weightKg} კგ` : '—'],
      [data.parentRoleLabel, data.parentName],
      ['ტელეფონი', data.parentPhone ?? '—'],
      ['გაცემის თარიღი', formatTbilisi(data.concludedAt ?? data.visitDate)],
      ['პედიატრი', data.doctorName],
    ];

    const { left, width } = bounds(doc);
    const column = (width - 24) / 2;
    const startY = doc.y;

    rows.forEach(([label, value], index) => {
      const x = left + (index % 2) * (column + 24);
      const y = startY + Math.floor(index / 2) * 30;

      doc.font('ka').fontSize(8.5).fillColor(MUTED).text(label.toUpperCase(), x, y, {
        width: column,
        characterSpacing: 0.4,
      });
      doc.font('ka-bold').fontSize(11).fillColor(INK).text(value, x, y + 12, {
        width: column,
      });
    });

    doc.y = startY + Math.ceil(rows.length / 2) * 30 + 4;

    doc
      .font('ka')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        'დიაგნოზისა და დანიშნულების გამცემია ონლაინ პლატფორმა askdrteo.com '
        + `და მისი პედიატრი ${data.doctorName}.`,
        left,
        doc.y,
        { width },
      );

    doc.moveDown(0.9);
  }

  // ─── 2. დიაგნოზი ─────────────────────────────────────────────────

  private diagnosisBlock(doc: PDFKit.PDFDocument, data: ConclusionData): void {
    this.blockTitle(doc, 'დიაგნოზი');

    const { left, width } = bounds(doc);

    doc.font('ka-bold').fontSize(14).fillColor(BLUE_DEEP).text(data.diagnosis, left, doc.y, {
      width,
    });

    if (data.diagnosisNote) {
      doc.moveDown(0.5);
      doc
        .font('ka')
        .fontSize(11)
        .fillColor(INK)
        .text(data.diagnosisNote, { width, lineGap: 3 });
    }

    doc.moveDown(1.2);
  }

  // ─── 3. დანიშნულება ──────────────────────────────────────────────

  private prescriptionBlock(doc: PDFKit.PDFDocument, data: ConclusionData): void {
    this.blockTitle(doc, 'დანიშნულება');

    const { left, width } = bounds(doc);
    const text = data.prescription.trim() || 'მედიკამენტური მკურნალობა არ დანიშნულა.';
    const top = doc.y;

    // ჩარჩო — ეს ის ნაწილია, რომელსაც ოჯახი აფთიაქში მიაქვს
    const height = doc.font('ka').fontSize(11.5).heightOfString(text, { width: width - 28, lineGap: 4 }) + 28;

    doc.roundedRect(left, top, width, height, 8).lineWidth(1).strokeColor(BLUE).stroke();
    doc.font('ka').fontSize(11.5).fillColor(INK).text(text, left + 14, top + 14, {
      width: width - 28,
      lineGap: 4,
    });

    doc.y = top + height + 12;
  }

  /**
   * ქვედა კოლონტიტული.
   *
   * გვერდის ბოლოზეა მიმაგრებული და არა ტექსტის ნაკადში — გრძელი
   * დანიშნულებისას ის კიდეს სცდებოდა და ბოლო სტრიქონი იჭრებოდა.
   */
  private footer(doc: PDFKit.PDFDocument): void {
    const { left, width } = bounds(doc);
    const bottom = doc.page.height - doc.page.margins.bottom;

    // კომპაქტური ზოლი გვერდის ბოლოში. გაცემის თარიღი ზემოთ უკვე
    // წერია, ამიტომ აქ მხოლოდ გაფრთხილება რჩება.
    const needed = 42;
    if (doc.y > bottom - needed) doc.addPage();

    doc.y = bottom - needed;

    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.8).strokeColor(LINE).stroke();
    doc.moveDown(0.7);

    doc
      .font('ka')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(
        'დოკუმენტი შედგენილია ონლაინ კონსულტაციის საფუძველზე და არ ცვლის პირად '
        + 'გასინჯვას. მდგომარეობის გაუარესებისას დაუყოვნებლივ მიმართეთ ექიმს.',
        { width, lineGap: 2 },
      );
  }

  /** ბლოკის სათაური — ცისფერი ზოლი და წარწერა. */
  private blockTitle(doc: PDFKit.PDFDocument, title: string): void {
    const { left, width } = bounds(doc);
    const y = doc.y;

    doc.rect(left, y + 2, 3, 13).fill(BLUE);
    doc.font('ka-bold').fontSize(11).fillColor(BLUE_DEEP).text(title.toUpperCase(), left + 11, y, {
      width: width - 11,
      characterSpacing: 0.6,
    });

    doc.moveDown(0.7);
  }
}

function bounds(doc: PDFKit.PDFDocument): { left: number; width: number } {
  const left = doc.page.margins.left;
  return { left, width: doc.page.width - left - doc.page.margins.right };
}

/** „1 წლის და 10 თვის" — დოკუმენტში ასაკი ყოველთვის სრულად იწერება. */
function childAge(birthDate: Date): string {
  const now = new Date();
  const months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());

  if (months < 12) return `${months} თვის`;

  const years = Math.floor(months / 12);
  const rest = months % 12;

  return rest ? `${years} წლის და ${rest} თვის` : `${years} წლის`;
}
