import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, TableLayoutType,
} from 'docx'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await prisma.report.findUnique({
    where: { id },
    include: { client: true },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const topPages = report.topPages ? JSON.parse(report.topPages) : []
  const tasks = report.tasks ? JSON.parse(report.tasks) : []
  const monthName = new Date(report.year, report.month - 1).toLocaleString('en', { month: 'long' })
  const clientName = report.client?.name ?? 'Client'

  const noBorder = { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideH: { style: BorderStyle.NONE, size: 0 }, insideV: { style: BorderStyle.NONE, size: 0 } }
  const thinBorder = { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 }, insideH: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }, insideV: { style: BorderStyle.NONE, size: 0 } }

  function metricRow(label: string, value: string | number | null | undefined, deltaVal?: number | null) {
    const valStr = value !== null && value !== undefined ? String(value) : '—'
    const deltaStr = deltaVal !== undefined && deltaVal !== null && deltaVal !== 0
      ? ` (${deltaVal > 0 ? '+' : ''}${deltaVal}%)`
      : ''
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFFFFF' },
          children: [new Paragraph({ children: [new TextRun({ text: label, color: '64748B', size: 22 })] })],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          borders: thinBorder,
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFFFFF' },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: valStr, bold: true, size: 22 }),
              ...(deltaStr ? [new TextRun({ text: deltaStr, color: deltaVal! > 0 ? '22C55E' : 'EF4444', size: 20 })] : []),
            ],
          })],
        }),
      ],
    })
  }

  function sectionHeading(text: string) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 80 },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: '475569', characterSpacing: 40 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0', space: 4 } },
    })
  }

  function spacer() {
    return new Paragraph({ spacing: { before: 80, after: 80 }, children: [] })
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 24 } },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
      children: [
        // Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: `${clientName} — Monthly Report`, bold: true, size: 48, color: '1C2232' })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `${monthName} ${report.year}`, size: 26, color: '64748B' })],
        }),
        new Paragraph({
          spacing: { after: 320 },
          children: [new TextRun({ text: report.client?.domain ?? '', size: 22, color: '94A3B8' })],
        }),

        // Summary table
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            new TableRow({
              children: [
                summaryCard('Sessions', report.sessions ? (report.sessions >= 1000 ? `${(report.sessions / 1000).toFixed(0)}K` : String(report.sessions)) : '—', 'GA4', noBorder),
                summaryCard('Desktop Perf', report.desktopPerf ? String(report.desktopPerf) : '—', 'PageSpeed', noBorder),
                summaryCard('Site Health', report.siteHealth ? `${report.siteHealth}%` : '—', 'SEMrush', noBorder),
                summaryCard('Open Tasks', report.openTasks !== null && report.openTasks !== undefined ? String(report.openTasks) : '—', 'ClickUp', noBorder),
              ],
            }),
          ],
        }),
        spacer(),

        // GA4
        sectionHeading('Google Analytics 4'),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            metricRow('Sessions', report.sessions?.toLocaleString(), report.sessionsDelta),
            metricRow('Total users', report.totalUsers?.toLocaleString(), report.totalUsersDelta),
            metricRow('New users', report.newUsers?.toLocaleString(), report.newUsersDelta),
            metricRow('Avg session duration', report.avgSessionDuration),
            metricRow('Bounce rate', report.bounceRate ? `${report.bounceRate}%` : null, report.bounceRateDelta),
          ],
        }),
        ...(topPages.length ? [
          spacer(),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'TOP PAGES', bold: true, size: 20, color: '94A3B8', characterSpacing: 40 })] }),
          ...topPages.slice(0, 5).map((p: { path: string; sessions: number }, i: number) => new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: `${i + 1}.  `, color: '8B5CF6', bold: true, size: 22 }),
              new TextRun({ text: p.path, color: '475569', size: 22 }),
              new TextRun({ text: `  ${p.sessions.toLocaleString()}`, bold: true, size: 22 }),
            ],
          })),
        ] : []),

        spacer(),

        // PageSpeed
        sectionHeading('PageSpeed Insights'),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'DESKTOP', bold: true, size: 20, color: '94A3B8', characterSpacing: 40 })] }),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            metricRow('Performance', report.desktopPerf),
            metricRow('Accessibility', report.desktopAccess),
            metricRow('Best Practices', report.desktopBestPrac),
            metricRow('SEO', report.desktopSeo),
            ...(report.fcpDesktop ? [metricRow('FCP', report.fcpDesktop), metricRow('LCP', report.lcpDesktop)] : []),
          ],
        }),
        spacer(),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'MOBILE', bold: true, size: 20, color: '94A3B8', characterSpacing: 40 })] }),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            metricRow('Performance', report.mobilePerf),
            metricRow('Accessibility', report.mobileAccess),
            metricRow('Best Practices', report.mobileBestPrac),
            metricRow('SEO', report.mobileSeo),
            ...(report.fcpMobile ? [metricRow('FCP', report.fcpMobile), metricRow('LCP', report.lcpMobile)] : []),
          ],
        }),
        spacer(),

        // SEMrush
        sectionHeading('SEMrush Site Audit'),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            metricRow('Site Health', report.siteHealth ? `${report.siteHealth}%` : null),
            metricRow('Errors', report.errors),
            metricRow('Warnings', report.warnings?.toLocaleString()),
            metricRow('Crawlability', report.crawlability ? `${report.crawlability}%` : null),
            metricRow('Internal Linking', report.internalLinking ? `${report.internalLinking}%` : null),
          ],
        }),
        spacer(),

        // ClickUp
        sectionHeading('ClickUp Tasks'),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorder,
          rows: [
            metricRow('Open', report.openTasks),
            metricRow('In Progress', report.inProgressTasks),
            metricRow('Completed', report.completedTasks),
          ],
        }),
        ...(tasks.length ? [
          spacer(),
          ...tasks.slice(0, 8).map((t: { name: string; status: string }) => new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({ text: '● ', color: '8B5CF6', size: 22 }),
              new TextRun({ text: t.name, size: 22 }),
              new TextRun({ text: `  [${t.status}]`, color: '94A3B8', size: 20 }),
            ],
          })),
        ] : []),

        // AI Summary
        ...(report.aiSummary ? [
          spacer(),
          sectionHeading('AI Summary'),
          new Paragraph({
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: report.aiSummary, size: 22, color: '334155' })],
          }),
        ] : []),

        // Footer
        spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0', space: 8 } },
          children: [new TextRun({ text: `Generated by ReportHub · ${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 18, color: '94A3B8' })],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `${clientName}-${monthName}-${report.year}-report.docx`.replace(/\s+/g, '-')

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function summaryCard(label: string, value: string, source: string, borders: object) {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    borders: borders as never,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F8FAFC' },
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: label.toUpperCase(), size: 18, color: '64748B', bold: true, characterSpacing: 40 })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: value, size: 40, bold: true, color: '0F172A' })] }),
      new Paragraph({ children: [new TextRun({ text: source, size: 18, color: '94A3B8' })] }),
    ],
  })
}
