import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimetableEntry } from './types';

interface ExportOptions {
  title: string;
  subtitle?: string;
  entries: TimetableEntry[];
}

export function exportTimetableToPDF({ title, subtitle, entries }: ExportOptions) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  
  // Get unique time slots
  const timeSlotsMap = new Map<string, { startTime: string; endTime: string; slotOrder: number }>();
  entries.forEach(entry => {
    if (entry.timeSlot) {
      timeSlotsMap.set(entry.timeSlot.id, {
        startTime: entry.timeSlot.startTime,
        endTime: entry.timeSlot.endTime,
        slotOrder: entry.timeSlot.slotOrder,
      });
    }
  });
  
  const timeSlots = Array.from(timeSlotsMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => a.slotOrder - b.slotOrder);

  // Build table data
  const tableData: string[][] = [];
  
  for (const slot of timeSlots) {
    const row: string[] = [`${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`];
    
    for (const day of days) {
      const dayEntries = entries.filter(e => 
        e.timeSlot?.id === slot.id && 
        e.timeSlot?.day === day
      );
      
      if (dayEntries.length === 0) {
        row.push('');
      } else {
        const cellContent = dayEntries.map(e => {
          const course = e.course?.code || 'Unknown';
          const instructor = e.instructor ? `${e.instructor.title} ${e.instructor.fullName}` : '';
          const room = e.room?.name || '';
          const section = e.section?.name || '';
          return `${course}\n${instructor}\n${room} (${section})`;
        }).join('\n---\n');
        row.push(cellContent);
      }
    }
    
    tableData.push(row);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 148, 15, { align: 'center' });
  
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 148, 22, { align: 'center' });
  }

  // Table
  autoTable(doc, {
    head: [['Time', ...days]],
    body: tableData,
    startY: subtitle ? 28 : 22,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
      halign: 'center',
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      148,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 20,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }

  // Download
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}