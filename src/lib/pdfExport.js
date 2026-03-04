import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PDFExportOptions {
  filename?: string;
  title?: string;
  data: Record<string, any>[];
  columns: Array<{
    header: string;
    dataKey: string;
  }>;
}

/**
 * Export data to PDF with proper styling and black text on white background
 */
export function exportToPDF(options: PDFExportOptions) {
  try {
    const {
      filename = 'export.pdf',
      title = 'Report',
      data,
      columns,
    } = options;

    // Create PDF document with white background
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Set text color to black
    doc.setTextColor(0, 0, 0);

    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 15);

    // Add timestamp
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 14, 22);

    // Prepare table data
    const tableData = data.map(row =>
      columns.map(col => {
        const value = row[col.dataKey];
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return value ?? '-';
      })
    );

    // Add table with proper styling
    (doc as any).autoTable({
      startY: 30,
      head: [columns.map(col => col.header)],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // Blue background
        textColor: [255, 255, 255], // White text
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3,
      },
      bodyStyles: {
        textColor: [0, 0, 0], // Black text
        fillColor: [255, 255, 255], // White background
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [243, 244, 246], // Light gray for alternating rows
        textColor: [0, 0, 0],
      },
      columnStyles: {
        // Ensure all columns have proper text color
        ...Object.fromEntries(
          Array.from({ length: columns.length }, (_, i) => [
            i,
            { textColor: [0, 0, 0] },
          ])
        ),
      },
      margin: { top: 30, right: 14, bottom: 14, left: 14 } as any,
      didDrawPage: (data: any) => {
        // Footer
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();

        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      },
    });

    // Save the PDF
    doc.save(filename);

    return { success: true, message: 'PDF exported successfully' };
  } catch (error) {
    console.error('PDF export error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export PDF',
    };
  }
}

/**
 * Export user list to PDF
 */
export function exportUsersToPDF(users: any[]) {
  return exportToPDF({
    filename: `users-${new Date().toISOString().split('T')[0]}.pdf`,
    title: 'User List Report',
    data: users,
    columns: [
      { header: 'Name', dataKey: 'name' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Role', dataKey: 'role' },
      { header: 'Status', dataKey: 'isSuspended' },
      { header: 'Created', dataKey: 'createdAt' },
    ],
  });
}

/**
 * Export tickets to PDF
 */
export function exportTicketsToPDF(tickets: any[]) {
  return exportToPDF({
    filename: `tickets-${new Date().toISOString().split('T')[0]}.pdf`,
    title: 'Tickets Report',
    data: tickets,
    columns: [
      { header: 'Order No', dataKey: 'orderNo' },
      { header: 'Date Received', dataKey: 'dateReceived' },
      { header: 'Faults Man', dataKey: 'faultsMan' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Created', dataKey: 'createdAt' },
    ],
  });
}
