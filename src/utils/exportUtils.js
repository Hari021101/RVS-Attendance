import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export multiple datasets to a single styled Excel file using ExcelJS
 * @param {Array} datasets - Array of { data, sheetName } objects
 * @param {string} filename - Output filename
 */
/**
 * Helper to export a matrix-style sheet
 */
const exportMatrixSheet = (worksheet, data, colors, eventOverrides) => {
  const { dates, employees, matrix } = data;
  if (!dates.length || !employees.length) return;

  // 1. Setup Header Row (Date | Emp1 | Emp2 | ...)
  const columns = ['Date', ...employees];
  worksheet.getRow(4).values = columns;
  const headerRow = worksheet.getRow(4);
  headerRow.height = 30;
  
  headerRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primary } };
    cell.font = { bold: true, color: { argb: colors.headerText }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { 
        bottom: { style: 'medium', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });

  // Freeze the first column (Dates) and the header row
  worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 4 }];

  // 2. Add Matrix Rows
  dates.forEach((dateString) => {
    const d = new Date(dateString);
    const isSunday = d.getDay() === 0;
    
    // Check for override
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    const override = eventOverrides.find(o => o.date === localDate);
    const isHoliday = override && /holiday|leave|vacation|off/i.test(override.type || '');

    // Construct Row Data
    const rowValues = [dateString];
    employees.forEach(empName => {
        const record = matrix[dateString][empName];
        if (override) {
            rowValues.push(override.label.toUpperCase());
        } else if (isSunday) {
            rowValues.push('WEEK-END');
        } else if (!record) {
            rowValues.push('-');
        } else {
            rowValues.push(record.status === 'Absent' ? 'ABSENT' : record.inTime);
        }
    });

    const row = worksheet.addRow(rowValues);
    row.height = 20;

    // 3. Style Cells based on content/logic
    row.eachCell((cell, colNum) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.border = { 
          bottom: { style: 'thin', color: { argb: 'FFEDF2F7' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };

      const val = cell.value ? cell.value.toString() : '';

      if (colNum === 1) { // Date Column
          cell.font = { bold: true, color: { argb: colors.primary } };
          cell.alignment = { horizontal: 'left' };
      }

      if (override) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isHoliday ? colors.holiday : colors.teamOut } };
          cell.font = { ...cell.font, italic: true, bold: true, color: { argb: isHoliday ? colors.holidayText : colors.teamOutText } };
      } else if (isSunday) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { ...cell.font, italic: true, color: { argb: 'FF94A3B8' } };
      } else if (colNum > 1) {
          // Status coloring
          if (val === 'ABSENT') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.absent } };
              cell.font = { bold: true, color: { argb: colors.absentText } };
          } else if (val !== '-' && val !== 'WEEK-END') {
              // Check if late (we need to look back at the record if possible, or just parse row data)
              // Since we already have 'matrix' available, we can check the record
              const empName = employees[colNum - 2];
              const record = matrix[dateString][empName];
              if (record?.isLate) {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.late } };
                  cell.font = { bold: true, color: { argb: colors.lateText } };
              } else {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.present } };
                  cell.font = { bold: true, color: { argb: colors.presentText } };
              }
          }
      }
    });
  });

  // Auto-adjust column width
  worksheet.columns.forEach((column, i) => {
    column.width = i === 0 ? 15 : 12;
  });
};

export const exportComprehensiveExcel = async (datasets, filename = 'Attendance_Full_Report.xlsx', eventOverrides = []) => {
  const workbook = new ExcelJS.Workbook();
  
  const colors = {
    primary: 'FF6366F1',        // Indigo
    secondary: 'FFA855F7',      // Violet
    headerBg: 'FF4F46E5',       // Darker Indigo
    headerText: 'FFFFFFFF',
    oddRow: 'FFF8FAFC',
    present: 'FFECFDF5',
    presentText: 'FF065F46',
    absent: 'FFFEF2F2',
    absentText: 'FF991B1B',
    late: 'FFFFFBEB',
    lateText: 'FF92400E',
    border: 'FFE2E8F0',
    holiday: 'FFF5F3FF',
    holidayText: 'FF5B21B6',
    teamOut: 'FFF0FDFA',
    teamOutText: 'FF115E59',
    titleText: 'FF1E293B'      // Dark slate
  };
  
  for (const { data, sheetName, title, isMatrix } of datasets) {
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Premium Title Row
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '📊 RVS ATTENDANCE MONITOR';
    titleCell.font = { 
      name: 'Segoe UI', 
      size: 18, 
      bold: true, 
      color: { argb: colors.primary }
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' }
    };
    worksheet.getRow(1).height = 30;

    // Elegant Subtitle
    worksheet.mergeCells('A2:F2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `📋 ${title} • Generated: ${new Date().toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    })}`;
    subtitleCell.font = { 
      name: 'Segoe UI', 
      size: 11, 
      italic: true, 
      color: { argb: 'FF64748B' }
    };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(2).height = 22;

    if (isMatrix) {
        exportMatrixSheet(worksheet, data, colors, eventOverrides);
        continue;
    }

    // Standard list export logic
    if (!data.length) continue;
    const cleanedData = data.map(({ isLate, ...rest }) => rest);
    const columns = Object.keys(cleanedData[0]);
    const headerRowIndex = 4;

    // Premium Column Headers
    worksheet.getRow(headerRowIndex).values = columns.map(col => col.toUpperCase());
    worksheet.columns = columns.map(col => ({ key: col, width: 20 }));

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { 
        name: 'Segoe UI', 
        bold: true, 
        color: { argb: colors.headerText }, 
        size: 12 
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: colors.primary } }
      };
    });

    cleanedData.forEach((item) => {
      const row = worksheet.addRow(item);
      const dateVal = item['Date'] || item['Attendance Date'];
      let isSunday = false;
      let override = null;

      if (dateVal) {
          const d = new Date(dateVal);
          isSunday = d.getDay() === 0;
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const localDate = `${year}-${month}-${day}`;
          override = eventOverrides.find(o => o.date === localDate);
      }
      
      row.eachCell((cell) => {
        const colKey = worksheet.getColumn(cell.col).header || columns[cell.col - 1];
        const val = String(cell.value || '').toLowerCase();
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: 'Segoe UI', size: 10 };

        if (override) {
            const isHoliday = /holiday|leave|vacation|off/i.test(override.type || '');
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isHoliday ? colors.holiday : colors.teamOut } };
            if (colKey && colKey.toLowerCase().includes('status')) {
                cell.value = override.label.toUpperCase();
                cell.font = { bold: true };
            }
        } else if (isSunday) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            if (colKey && colKey.toLowerCase().includes('status')) {
                cell.value = 'WEEK-END';
            }
        } else if (colKey && colKey.toLowerCase().includes('status')) {
            if (val.includes('present')) {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.present } };
               cell.font = { bold: true, color: { argb: colors.presentText } };
            } else if (val.includes('absent')) {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.absent } };
               cell.font = { bold: true, color: { argb: colors.absentText } };
            } else if (val.includes('late')) {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.late } };
               cell.font = { bold: true, color: { argb: colors.lateText } };
            }
        }
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};

/**
 * Export multiple datasets to a single stylish PDF
 */
export const exportComprehensivePDF = (sections, mainTitle = 'Attendance Full Report', filename = 'Attendance_Full_Report.pdf', eventOverrides = []) => {
  const doc = new jsPDF();
  
  const colors = {
    primary: [37, 99, 235],
    secondary: [100, 116, 139],
    present: [220, 252, 231],
    presentText: [22, 101, 52],
    absent: [254, 226, 226],
    absentText: [153, 27, 27],
    late: [254, 249, 195],
    lateText: [133, 77, 14],
    holiday: [245, 243, 255],
    holidayText: [91, 33, 182],
    teamOut: [240, 253, 250],
    teamOutText: [17, 94, 89]
  };
  
  const renderHeader = (pageDoc) => {
    // Header Bar
    pageDoc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pageDoc.rect(0, 0, 210, 40, 'F');

    pageDoc.setFontSize(24);
    pageDoc.setTextColor(255, 255, 255);
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.text('RVS ATTENDANCE', 14, 22);
    
    pageDoc.setFontSize(12);
    pageDoc.setTextColor(219, 234, 254);
    pageDoc.text(mainTitle.toUpperCase(), 14, 32);
    
    pageDoc.setFontSize(9);
    pageDoc.setTextColor(191, 219, 254);
    pageDoc.text(`Generated: ${new Date().toLocaleString()}`, 160, 32);
  };

  sections.forEach((section, index) => {
    if (index > 0) doc.addPage();
    renderHeader(doc);
    let currentY = 50;

    doc.setFontSize(16);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(section.title, 14, currentY);
    currentY += 10;

    const data = section.data;
    if (!data) return;

    let columns, rows;
    if (section.isMatrix) {
      const { dates, employees, matrix } = data;
      columns = ['Date', ...employees];
      rows = dates.map(date => {
        const d = new Date(date);
        const isSunday = d.getDay() === 0;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const localDate = `${year}-${month}-${day}`;
        const override = eventOverrides.find(o => o.date === localDate);

        return [date, ...employees.map(emp => {
          if (override) return override.label.toUpperCase();
          if (isSunday) return 'WEEK-END';
          const record = matrix[date][emp];
          if (!record) return '-';
          return record.status === 'Absent' ? 'ABSENT' : record.inTime;
        })];
      });
    } else {
      if (data.length === 0) return;
      columns = Object.keys(data[0]).filter(key => key !== 'isLate').map(col => col.toUpperCase());
      rows = data.map(item => Object.keys(item).filter(key => key !== 'isLate').map(col => String(item[col] || '-')));
    }

    autoTable(doc, {
      startY: currentY,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        fontSize: section.isMatrix ? 7 : 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { fontSize: section.isMatrix ? 6 : 7, cellPadding: 2 },
      didParseCell: (hookData) => {
        if (hookData.section !== 'body') return;

        const content = String(hookData.cell.raw || '').toLowerCase();
        const colTitle = (hookData.column.title || '').toString().toLowerCase();
        
        // Detect Sunday & Overrides from row data
        const rowData = hookData.row.raw;
        const dateVal = rowData[0]; 
        let isSunday = false;
        let override = null;

        if (dateVal && typeof dateVal === 'string') {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                isSunday = d.getDay() === 0;
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const localDate = `${year}-${month}-${day}`;
                override = eventOverrides.find(o => o.date === localDate);
            }
        }

        if (override) {
            const isHoliday = /holiday|leave|vacation|off/i.test(override.type || '');
            hookData.cell.styles.fillColor = isHoliday ? colors.holiday : colors.teamOut;
            hookData.cell.styles.textColor = isHoliday ? colors.holidayText : colors.teamOutText;
            hookData.cell.styles.fontStyle = 'italic';
            
            if (colTitle.includes('status') || section.isMatrix) {
                hookData.cell.text = [override.label.toUpperCase()];
                hookData.cell.styles.fontStyle = 'bold';
            }
        } else if (isSunday) {
            hookData.cell.styles.fillColor = [241, 245, 249]; // Subtle gray
            hookData.cell.styles.textColor = [148, 163, 184]; // Muted text
            hookData.cell.styles.fontStyle = 'italic';
            
            if (colTitle.includes('status') || section.isMatrix) {
                hookData.cell.text = section.isMatrix ? ['WEEK-END'] : hookData.cell.text;
                hookData.cell.styles.textColor = [100, 116, 139];
                hookData.cell.styles.fontStyle = 'bold';
            }
        } else if (content === 'absent') {
            hookData.cell.styles.fillColor = colors.absent;
            hookData.cell.styles.textColor = colors.absentText;
            hookData.cell.styles.fontStyle = 'bold';
        } else if (content !== '-' && !content.includes('week-end') && hookData.column.index > 0) {
            // Check for late status in matrix mode
            if (section.isMatrix && section.data.matrix && section.data.matrix[dateVal]) {
                const empName = section.data.employees[hookData.column.index - 1]; // First col is Date
                const record = section.data.matrix[dateVal][empName];
                if (record?.isLate) {
                    hookData.cell.styles.fillColor = colors.late;
                    hookData.cell.styles.textColor = colors.lateText;
                    hookData.cell.styles.fontStyle = 'bold';
                } else if (record) {
                    hookData.cell.styles.fillColor = colors.present;
                    hookData.cell.styles.textColor = colors.presentText;
                    hookData.cell.styles.fontStyle = 'bold';
                }
            } else if (!section.isMatrix && colTitle.includes('status')) {
                if (content.includes('present')) {
                    hookData.cell.styles.fillColor = colors.present;
                    hookData.cell.styles.textColor = colors.presentText;
                    hookData.cell.styles.fontStyle = 'bold';
                } else if (content.includes('late')) {
                    hookData.cell.styles.fillColor = colors.late;
                    hookData.cell.styles.textColor = colors.lateText;
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        }
      },
      didDrawPage: (data) => {
        const str = 'Page ' + doc.internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });
  });

  doc.save(filename);
};
