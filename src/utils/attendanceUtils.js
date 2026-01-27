/**
 * Helper to parse "HH:MM" string to minutes for comparison
 */
export const parseTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

/**
 * Main attendance data processing logic
 */
export const processAttendanceData = (data, lateCutoffMinutes = 635) => { // Default 10:35 AM
  const uniqueEmployees = new Set();
  const employeeMap = {};
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;

  const processedData = data
    .filter(row => {
      // Filter out invalid rows (headers, empty codes)
      const eCode = row['E. Code'] || row['Emp Code'] || row['Employee Code'];
      return eCode && eCode !== 'E. Code' && eCode !== 'Emp Code' && eCode !== 'SNo';
    })
    .map(row => {
      const eCode = String(row['E. Code'] || row['Emp Code'] || row['Employee Code']).trim();
      if (eCode) uniqueEmployees.add(eCode);

      const inTimeStr = row['InTime'] || row['In Time'] || row['Time In'];
      const outTimeStr = row['OutTime'] || row['Out Time'] || row['Time Out'];
      
      // Flexible date detection
      let dateStr = row['Date'] || row['Attendance Date'] || row['Punch Date'] || row['Att Date'] || row['Log Date'] || row['Day'];
      if (!dateStr) {
        const dateKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('date') || key.toLowerCase().includes('day')
        );
        if (dateKey) dateStr = row[dateKey];
      }
      
      // Standardize status logic
      let status = (row['Status'] || '').toString().trim();

      // FORCE PRESENT logic
      if (inTimeStr && inTimeStr.trim().length > 0) {
        status = 'Present';
        if (!outTimeStr || outTimeStr.trim().length === 0) {
          status = 'Present (No Out Punch)';
        }
      }
      
      let isLate = false;
      if (status.startsWith('Present') && inTimeStr) {
        const inTimeMinutes = parseTime(inTimeStr);
        if (inTimeMinutes && inTimeMinutes > lateCutoffMinutes) {
          isLate = true;
        }
      }

      // Initialize/Update employee summary
      if (!employeeMap[eCode]) {
        employeeMap[eCode] = {
          code: eCode,
          name: row['Name'],
          present: 0,
          absent: 0,
          late: 0
        };
      }

      if (status.startsWith('Present')) {
        employeeMap[eCode].present++;
        totalPresent++;
        if (isLate) {
          employeeMap[eCode].late++;
          totalLate++;
        }
      } else if (status === 'Absent') {
        employeeMap[eCode].absent++;
        totalAbsent++;
      }

      return { 
        ...row, 
        'E. Code': eCode,
        'InTime': inTimeStr,
        'OutTime': outTimeStr,
        'Date': dateStr,
        'Status': status,
        isLate 
      };
    });

  return {
    processedData,
    summaryData: Object.values(employeeMap),
    stats: {
      totalEmployees: uniqueEmployees.size,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate
    }
  };
};
/**
 * Calculate matrix data for the detailed view
 * Ported from DateGroupedAttendance.jsx for shared use in exports
 */
export const calculateMatrixData = (data, colFilters = {}, eventOverrides = []) => {
  if (!data || data.length === 0) return { dates: [], employees: [], matrix: {} };
  
  const employeesSet = new Set();
  data.forEach(row => { if (row.Name) employeesSet.add(row.Name); });
  const employees = Array.from(employeesSet).sort();

  const dateGroups = data.reduce((acc, row) => {
    const date = row['Date'] || 'Unknown';
    if (!acc[date]) acc[date] = {};
    acc[date][row.Name] = {
      inTime: row.InTime,
      status: row.Status,
      isLate: row.isLate
    };
    return acc;
  }, {});

  let sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(a) - new Date(b));

  // Apply Filters
  const activeFilters = Object.entries(colFilters).filter(([_, val]) => val !== 'all');
  
  // FOCUS MODE: If any filters are active, only show the columns for those specific employees
  const displayEmployees = activeFilters.length > 0 
    ? activeFilters.map(([name]) => name).sort()
    : employees;

  if (activeFilters.length > 0) {
      sortedDates = sortedDates.filter(date => {
          // A row is included if ALL active filters are satisfied
          return activeFilters.every(([empName, statusType]) => {
              const record = dateGroups[date][empName];
              if (!record) return statusType === 'absent';
              
              const isLate = record.isLate;
              const isAbsent = record.status === 'Absent';
              const isOntime = !isLate && !isAbsent && record.inTime;

              if (statusType === 'ontime') return isOntime;
              if (statusType === 'late') return isLate;
              if (statusType === 'absent') return isAbsent;
              return true;
          });
      });
  }

  return { dates: sortedDates, employees: displayEmployees, matrix: dateGroups };
};
