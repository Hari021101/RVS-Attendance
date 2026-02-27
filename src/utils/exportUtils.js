import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTimeToAMPM } from "./attendanceUtils";

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
  const columns = ["Date", ...employees];
  const headerRow = worksheet.getRow(4);
  headerRow.values = columns;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2058A5" }, // Exact Manual Blue
    };
    cell.font = { bold: true, italic: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
    };
  });

  // 2. Setup Elegant Subtitle (Attendance for January - 2026)
  const firstDate = new Date(dates[0]);
  const monthYearLabel = firstDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const totalCols = employees.length + 1;
  worksheet.mergeCells(5, 1, 5, totalCols);
  const subtitleCell = worksheet.getCell(5, 1);
  subtitleCell.value = `Attendance for ${monthYearLabel}`;
  subtitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF00B0F0" }, // Exact Manual Cyan
  };
  subtitleCell.font = { bold: true, italic: true, color: { argb: "FFFFFFFF" }, size: 12 };
  subtitleCell.alignment = { vertical: "middle", horizontal: "center" };
  subtitleCell.border = {
    top: { style: "thin", color: { argb: "FFFFFFFF" } },
    left: { style: "thin", color: { argb: "FFFFFFFF" } },
    right: { style: "thin", color: { argb: "FFFFFFFF" } },
    bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
  };
  worksheet.getRow(5).height = 25;

  // Freeze the first column (Dates) and the header row (Rows 1-5)
  worksheet.views = [{ state: "frozen", xSplit: 1, ySplit: 5 }];

  const stats = employees.reduce((acc, emp) => {
    acc[emp] = { working: 0, absent: 0, late: 0, present: 0 };
    return acc;
  }, {});

  // 4. Rows Population
  dates.forEach((dateString) => {
    const d = new Date(dateString);
    const isSunday = d.getDay() === 0;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const localDate = `${year}-${month}-${day}`;
    const override = eventOverrides.find((o) => o.date === localDate);
    const isHoliday = override && /holiday|leave|vacation|off/i.test(override.type || "");

    // Determine if anyone worked on this day (Sunday/Holiday check)
    const anyEmployeeWorked = employees.some(emp => {
        const record = matrix[dateString][emp];
        return record && !["Absent", "-"].includes(record.status);
    });

    const rowValues = [dateString];
    employees.forEach((emp) => {
        const record = matrix[dateString][emp];
        const label = override ? override.label : "WEEK-END";
        const isScheduledDay = !isSunday && !isHoliday;

        if (isScheduledDay) {
            stats[emp].working++;
        }
        
        if (record) {
            if (record.status === "Half Day") {
                rowValues.push("Half Day");
                stats[emp].present += 0.5;
            } else if (record.status === "WFH") {
                rowValues.push("WFH");
                stats[emp].present++;
            } else if (record.status === "Present" || (!["Absent", "-"].includes(record.status) && record.inTime)) {
                rowValues.push(formatTimeToAMPM(record.inTime));
                stats[emp].present++;
                if (record.isLate) stats[emp].late++;
            } else if (isHoliday || isSunday) {
                rowValues.push(label);
            } else {
                rowValues.push("ABSENT");
                stats[emp].absent++;
            }
        } else if (isHoliday || isSunday) {
            rowValues.push(label);
        } else {
            rowValues.push("-");
            // If it's a scheduled day and no record exists, it's an implicit absence
            if (isScheduledDay) {
                stats[emp].absent++;
            }
        }
    });

    const row = worksheet.addRow(rowValues);
    row.height = 20;

    // Styling
    row.eachCell((cell, colNum) => {
      cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
      
      if (colNum === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2058A5" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if ((isHoliday || isSunday) && !anyEmployeeWorked) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B050" } }; // Green Bar
        cell.font = { bold: true, italic: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        const val = cell.value?.toString();
        const upperVal = val?.toUpperCase();
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Segoe UI", size: 9 };

        if (upperVal === "ABSENT" || upperVal === "HALF DAY") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
            cell.font = { bold: true, italic: true, color: { argb: "FFFFFFFF" } };
        } else if (upperVal === "WFH") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }; // Yellow
            cell.font = { bold: true, color: { argb: "FF000000" } };
        } else if (isHoliday || isSunday) {
            // Individual cell for worked/holiday mix
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B050" } };
            cell.font = { bold: true, italic: true, color: { argb: "FFFFFFFF" } };
        } else if (val !== "-" && colNum > 1) {
            const empName = employees[colNum - 2];
            const record = matrix[dateString][empName];
            if (record?.isLate) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
                cell.font = { bold: true, color: { argb: "FF9C0006" } };
            } else if (record || upperVal === "PRESENT") {
                cell.font = { color: { argb: "FF006100" }, bold: true }; 
            }
        }
      }
    });

    // Merge only if NO ONE worked on this holiday/weekend
    if ((isHoliday || isSunday) && !anyEmployeeWorked) {
        worksheet.mergeCells(row.number, 2, row.number, totalCols);
    }
  });

  // 5. Statistics Footer
  const addStatRow = (label, valueMapper, bgColor, textColor = "FFFFFFFF") => {
    const row = worksheet.addRow([label, ...employees.map(valueMapper)]);
    row.height = 25;
    row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.font = { bold: true, italic: true, color: { argb: textColor }, size: 10 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            left: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
            right: { style: "thin", color: { argb: "FFFFFFFF" } },
        };
    });
  };

  worksheet.addRow([]); // Gap row

  addStatRow("Total Working Days", (emp) => `${stats[emp].working} Days`, "FF2058A5");
  addStatRow("Total Days Persent", (emp) => `${stats[emp].present} Days`, "FF17375E");
  addStatRow("No of leaves Taken (Days)", (emp) => stats[emp].absent > 0 ? `${stats[emp].absent} Day${stats[emp].absent > 1 ? 's' : ''}` : "No leaves", "FFFF0066");
  addStatRow("No of days Coming late Days", (emp) => stats[emp].late > 0 ? `${stats[emp].late} Days` : "NA", "FFFF0066");

  addStatRow("2 late coming days is consider as half day leave (0.5 Day)", 
    (emp) => {
        if (stats[emp].late === 0) return "NA";
        const deduction = stats[emp].late * 0.25;
        let suffix = "Days";
        if (deduction === 1 || deduction === 0.5) suffix = "Day";
        else if (deduction % 1 !== 0) suffix = "DayS"; // Intentional "DayS" for decimals other than .5
        return `${deduction} ${suffix}`;
    }, 
    "FFFF0066"
  );

  // Column width configuration
  worksheet.columns.forEach((column, i) => {
    column.width = i === 0 ? 18 : 12;
  });
};

export const exportComprehensiveExcel = async (
  datasets,
  filename = "Attendance_Full_Report.xlsx",
  eventOverrides = [],
) => {
  const workbook = new ExcelJS.Workbook();

  const colors = {
    primary: "FF4F46E5", // Indigo 600
    secondary: "FF7C3AED", // Violet 600
    headerBg: "FF1E1B4B", // Indigo 950 (Deep contrast)
    headerText: "FFFFFFFF",
    oddRow: "FFF8FAFC", // Slate 50
    evenRow: "FFF1F5F9", // Slate 100
    present: "FFDCFCE7", // Green 100 (More visible)
    presentText: "FF166534", // Green 800
    absent: "FFFEE2E2", // Red 100
    absentText: "FF991B1B", // Red 800
    late: "FFF0F9FF", // Sky 100 (Better than light amber)
    lateText: "FF075985", // Sky 800
    border: "FFCBD5E1", // Slate 300 (Stronger contrast)
    holiday: "FFEDE9FE", // Violet 100
    holidayText: "FF5B21B6", // Violet 800
    teamOut: "FFCCFBF1", // Teal 100
    teamOutText: "FF115E59", // Teal 800
    titleText: "FF0F172A", // Slate 900
  };

  for (const { data, sheetName, title, isMatrix } of datasets) {
    const worksheet = workbook.addWorksheet(sheetName);

    // Premium Title Row
    worksheet.mergeCells("A1:F1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "📊 RVS ATTENDANCE MONITOR";
    titleCell.font = {
      name: "Segoe UI",
      size: 18,
      bold: true,
      color: { argb: colors.primary },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    worksheet.getRow(1).height = 30;

    // Elegant Subtitle
    worksheet.mergeCells("A2:F2");
    const subtitleCell = worksheet.getCell("A2");
    subtitleCell.value = `📋 ${title} • Generated: ${new Date().toLocaleString(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    )}`;
    subtitleCell.font = {
      name: "Segoe UI",
      size: 11,
      italic: true,
      color: { argb: "FF64748B" },
    };
    subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
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
    worksheet.getRow(headerRowIndex).values = columns.map((col) =>
      col.toUpperCase(),
    );
    worksheet.columns = columns.map((col) => ({ key: col, width: 20 }));

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: colors.headerBg },
      };
      cell.font = {
        name: "Segoe UI",
        bold: true,
        color: { argb: colors.headerText },
        size: 12,
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "medium", color: { argb: colors.primary } },
      };
    });

    cleanedData.forEach((item) => {
      // Format time fields to AM/PM
      const formattedItem = { ...item };
      Object.keys(formattedItem).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("time") || lowerKey.includes("check")) {
            formattedItem[key] = formatTimeToAMPM(formattedItem[key]);
        }
      });

      const row = worksheet.addRow(formattedItem);
      const dateVal = item["Date"] || item["Attendance Date"];
      let isSunday = false;
      let override = null;

      if (dateVal) {
        const d = new Date(dateVal);
        isSunday = d.getDay() === 0;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const localDate = `${year}-${month}-${day}`;
        override = eventOverrides.find((o) => o.date === localDate);
      }

      row.eachCell((cell) => {
        const colKey =
          worksheet.getColumn(cell.col).header || columns[cell.col - 1];
        const val = String(cell.value || "").toLowerCase();
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.font = { name: "Segoe UI", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: colors.border } },
          left: { style: "thin", color: { argb: colors.border } },
          bottom: { style: "thin", color: { argb: colors.border } },
          right: { style: "thin", color: { argb: colors.border } },
        };

        const rowIndex = worksheet.rowCount;
        const isEvenRow = rowIndex % 2 === 0;

        // Default striping
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEvenRow ? colors.evenRow : colors.oddRow },
        };

        if (override) {
          const isHoliday = /holiday|leave|vacation|off/i.test(
            override.type || "",
          );
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isHoliday ? colors.holiday : colors.teamOut },
          };
          if (colKey && colKey.toLowerCase().includes("status")) {
            cell.value = override.label.toUpperCase();
            cell.font = { bold: true };
          }
        } else if (isSunday) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEvenRow ? "FFE1E5EB" : "FFF1F5F9" },
          };
          if (colKey && colKey.toLowerCase().includes("status")) {
            cell.value = "WEEK-END";
          }
        } else if (colKey && colKey.toLowerCase().includes("status")) {
          if (val.includes("present")) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: colors.present },
            };
            cell.font = { bold: true, color: { argb: colors.presentText } };
          } else if (val.includes("absent")) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: colors.absent },
            };
            cell.font = { bold: true, color: { argb: colors.absentText } };
          } else if (val.includes("late")) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: colors.late },
            };
            cell.font = { bold: true, color: { argb: colors.lateText } };
          }
        }
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
};

/**
 * Export multiple datasets to a single stylish PDF
 */
export const exportComprehensivePDF = (
  sections,
  mainTitle = "Attendance Full Report",
  filename = "Attendance_Full_Report.pdf",
  eventOverrides = [],
) => {
  const doc = new jsPDF();

  const colors = {
    primary: [79, 70, 229], // Indigo 600
    secondary: [124, 58, 237], // Violet 600
    present: [220, 252, 231], // Green 100
    presentText: [22, 101, 52], // Green 800
    absent: [254, 226, 226], // Red 100
    absentText: [153, 27, 27], // Red 800
    late: [224, 242, 254], // Sky 100
    lateText: [7, 89, 133], // Sky 800
    holiday: [237, 233, 254], // Violet 100
    holidayText: [91, 33, 182], // Violet 800
    teamOut: [204, 251, 241], // Teal 100
    teamOutText: [17, 94, 89], // Teal 800
  };

  const renderHeader = (pageDoc) => {
    // Header Bar
    pageDoc.setFillColor(
      colors.primary[0],
      colors.primary[1],
      colors.primary[2],
    );
    pageDoc.rect(0, 0, 210, 40, "F");

    pageDoc.setFontSize(24);
    pageDoc.setTextColor(255, 255, 255);
    pageDoc.setFont("helvetica", "bold");
    pageDoc.text("RVS ATTENDANCE", 14, 22);

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
      columns = ["Date", ...employees];
      rows = dates.map((date) => {
        const d = new Date(date);
        const isSunday = d.getDay() === 0;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const localDate = `${year}-${month}-${day}`;
        const override = eventOverrides.find((o) => o.date === localDate);

        return [
          date,
          ...employees.map((emp) => {
            if (override) return override.label.toUpperCase();
            if (isSunday) return "WEEK-END";
            const record = matrix[date][emp];
            if (!record) return "-";
            return record.status === "Absent" ? "ABSENT" : formatTimeToAMPM(record.inTime);
          }),
        ];
      });
    } else {
      if (data.length === 0) return;
      columns = Object.keys(data[0])
        .filter((key) => key !== "isLate")
        .map((col) => col.toUpperCase());
      rows = data.map((item) =>
        Object.keys(item)
          .filter((key) => key !== "isLate")
          .map((col) => {
             const val = item[col];
             if (col.toLowerCase().includes("time") || col.toLowerCase().includes("check")) {
                 return formatTimeToAMPM(String(val || "-"));
             }
             return String(val || "-");
          }),
      );
    }

    autoTable(doc, {
      startY: currentY,
      head: [columns],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: colors.primary,
        fontSize: section.isMatrix ? 7 : 8,
        fontStyle: "bold",
        halign: "center",
      },
      styles: { fontSize: section.isMatrix ? 6 : 7, cellPadding: 2 },
      didParseCell: (hookData) => {
        if (hookData.section !== "body") return;

        const content = String(hookData.cell.raw || "").toLowerCase();
        const colTitle = (hookData.column.title || "").toString().toLowerCase();

        // Detect Sunday & Overrides from row data
        const rowData = hookData.row.raw;
        const dateVal = rowData[0];
        let isSunday = false;
        let override = null;

        if (dateVal && typeof dateVal === "string") {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            isSunday = d.getDay() === 0;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const localDate = `${year}-${month}-${day}`;
            override = eventOverrides.find((o) => o.date === localDate);
          }
        }

        if (override) {
          const isHoliday = /holiday|leave|vacation|off/i.test(
            override.type || "",
          );
          hookData.cell.styles.fillColor = isHoliday
            ? colors.holiday
            : colors.teamOut;
          hookData.cell.styles.textColor = isHoliday
            ? colors.holidayText
            : colors.teamOutText;
          hookData.cell.styles.fontStyle = "italic";

          if (colTitle.includes("status") || section.isMatrix) {
            hookData.cell.text = [override.label.toUpperCase()];
            hookData.cell.styles.fontStyle = "bold";
          }
        } else if (isSunday) {
          hookData.cell.styles.fillColor = [241, 245, 249]; // Subtle gray
          hookData.cell.styles.textColor = [148, 163, 184]; // Muted text
          hookData.cell.styles.fontStyle = "italic";

          if (colTitle.includes("status") || section.isMatrix) {
            hookData.cell.text = section.isMatrix
              ? ["WEEK-END"]
              : hookData.cell.text;
            hookData.cell.styles.textColor = [100, 116, 139];
            hookData.cell.styles.fontStyle = "bold";
          }
        } else if (content === "absent") {
          hookData.cell.styles.fillColor = colors.absent;
          hookData.cell.styles.textColor = colors.absentText;
          hookData.cell.styles.fontStyle = "bold";
        } else if (
          content !== "-" &&
          !content.includes("week-end") &&
          hookData.column.index > 0
        ) {
          // Check for late status in matrix mode
          if (
            section.isMatrix &&
            section.data.matrix &&
            section.data.matrix[dateVal]
          ) {
            const empName = section.data.employees[hookData.column.index - 1]; // First col is Date
            const record = section.data.matrix[dateVal][empName];
            if (record?.isLate) {
              hookData.cell.styles.fillColor = colors.late;
              hookData.cell.styles.textColor = colors.lateText;
              hookData.cell.styles.fontStyle = "bold";
            } else if (record) {
              hookData.cell.styles.fillColor = colors.present;
              hookData.cell.styles.textColor = colors.presentText;
              hookData.cell.styles.fontStyle = "bold";
            }
          } else if (!section.isMatrix && colTitle.includes("status")) {
            if (content.includes("present")) {
              hookData.cell.styles.fillColor = colors.present;
              hookData.cell.styles.textColor = colors.presentText;
              hookData.cell.styles.fontStyle = "bold";
            } else if (content.includes("late")) {
              hookData.cell.styles.fillColor = colors.late;
              hookData.cell.styles.textColor = colors.lateText;
              hookData.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
      didDrawPage: (data) => {
        const str = "Page " + doc.internal.getNumberOfPages();
        doc.setFontSize(9);
        doc.setTextColor(
          colors.secondary[0],
          colors.secondary[1],
          colors.secondary[2],
        );
        doc.text(
          str,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10,
        );
      },
    });
  });

  doc.save(filename);
};
