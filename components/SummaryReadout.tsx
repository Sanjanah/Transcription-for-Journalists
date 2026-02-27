import React, { useMemo } from 'react';
import { X, Download, Copy, Check, Printer } from 'lucide-react';
import { Button } from './Button';
import { copyToClipboard, downloadText } from '../utils/fileHelper';

interface SummaryReadoutProps {
  summary: string;
  onClose: () => void;
}

// Lightweight markdown-to-React renderer for our structured summary format
function parseMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match **bold**, then remaining text
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-journal-900">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  // Collect table rows into a table
  const tryParseTable = (startIdx: number): { element: React.ReactNode; endIdx: number } | null => {
    // Check if current line looks like a table header row
    const headerLine = lines[startIdx]?.trim();
    if (!headerLine || !headerLine.startsWith('|') || !headerLine.endsWith('|')) return null;

    // Next line should be the separator
    const sepLine = lines[startIdx + 1]?.trim();
    if (!sepLine || !/^\|[\s\-:|]+\|$/.test(sepLine)) return null;

    // Parse header cells
    const headerCells = headerLine.split('|').filter(c => c.trim() !== '').map(c => c.trim());

    // Parse data rows
    const rows: string[][] = [];
    let rowIdx = startIdx + 2;
    while (rowIdx < lines.length) {
      const rowLine = lines[rowIdx]?.trim();
      if (!rowLine || !rowLine.startsWith('|') || !rowLine.endsWith('|')) break;
      const cells = rowLine.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      rows.push(cells);
      rowIdx++;
    }

    const tableKey = key++;
    const element = (
      <div key={`tbl-${tableKey}`} className="my-6 overflow-x-auto rounded-xl border border-journal-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-journal-800 text-white">
              {headerCells.map((cell, ci) => (
                <th key={ci} className="px-5 py-3 text-left font-semibold tracking-wide text-xs uppercase whitespace-nowrap">
                  {parseInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-journal-100">
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-journal-50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-5 py-3 text-journal-700 whitespace-nowrap">
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    return { element, endIdx: rowIdx };
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // H1 — Main title
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      elements.push(
        <div key={key++} className="mb-8 pb-6 border-b-2 border-journal-200">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-journal-900 leading-tight">
            {parseInline(trimmed.slice(2))}
          </h1>
        </div>
      );
      i++;
      continue;
    }

    // H2 — Section headers
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      elements.push(
        <h2 key={key++} className="font-serif text-xl md:text-2xl font-bold text-journal-800 mt-10 mb-4 pb-2 border-b border-journal-100 flex items-center gap-2">
          <span className="w-1 h-6 bg-journal-accent rounded-full inline-block"></span>
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H3 — Subsection / speaker headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-journal-700 mt-6 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-journal-accent rounded-full inline-block"></span>
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // Tables
    const tableResult = tryParseTable(i);
    if (tableResult) {
      elements.push(tableResult.element);
      i = tableResult.endIdx;
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="my-4 pl-5 border-l-4 border-journal-accent bg-blue-50/50 py-3 pr-4 rounded-r-lg">
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="text-journal-700 font-serif italic text-base leading-relaxed">
              {parseInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Bullet list items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-3 space-y-2 ml-1">
          {items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-3 text-journal-700 leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 bg-journal-400 rounded-full shrink-0"></span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-journal-700 leading-relaxed mb-4">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return elements;
}

export const SummaryReadout: React.FC<SummaryReadoutProps> = ({ summary, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const renderedContent = useMemo(() => parseMarkdown(summary), [summary]);

  const handleCopy = async () => {
    const success = await copyToClipboard(summary);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadText(summary, `readout-${new Date().toISOString().slice(0, 10)}.txt`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>Transcript Readout</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; color: #18181b; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }
          h1 { font-family: 'Playfair Display', serif; font-size: 28px; border-bottom: 2px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 24px; }
          h2 { font-family: 'Playfair Display', serif; font-size: 20px; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px; margin-top: 32px; }
          h3 { font-size: 16px; font-weight: 600; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
          th { background: #27272a; color: white; padding: 10px 14px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          td { padding: 10px 14px; border-bottom: 1px solid #e4e4e7; }
          tr:nth-child(even) { background: #fafafa; }
          blockquote { border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; background: #eff6ff; border-radius: 0 8px 8px 0; font-style: italic; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          @media print { body { margin: 20px; } }
        </style>
      </head><body>
        ${document.getElementById('summary-readout-content')?.innerHTML || ''}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 md:p-8">
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4 border border-journal-200 animate-in"
        style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-sm border-b border-journal-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-journal-accent/10 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-journal-900 text-sm">Professional Readout</h2>
              <p className="text-xs text-journal-400">AI-generated synopsis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} title="Print readout" className="h-8 w-8 px-0 md:w-auto md:px-3">
              <Printer size={14} className="md:mr-1.5" />
              <span className="hidden md:inline">Print</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} title="Copy to clipboard" className="h-8 w-8 px-0 md:w-auto md:px-3">
              {copied ? <Check size={14} className="md:mr-1.5" /> : <Copy size={14} className="md:mr-1.5" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} title="Download as text" className="h-8 w-8 px-0 md:w-auto md:px-3">
              <Download size={14} className="md:mr-1.5" />
              <span className="hidden md:inline">Download</span>
            </Button>
            <div className="h-4 w-px bg-journal-200 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-journal-100 text-journal-500 hover:text-journal-700 transition-colors"
              title="Close readout"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="summary-readout-content" className="px-8 md:px-12 py-8 max-h-[75vh] overflow-y-auto">
          {renderedContent}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-journal-100 bg-journal-50/50 rounded-b-2xl">
          <p className="text-xs text-journal-400 text-center">
            This readout was generated by AI from the transcript. Always verify facts and figures against original sources.
          </p>
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};