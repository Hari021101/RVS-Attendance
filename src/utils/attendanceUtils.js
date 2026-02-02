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

// ============================================================================
// ANALYTICS UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate daily attendance statistics for trend chart
 * @param {Array} attendanceData - Raw attendance records
 * @param {Date} startDate - Start of time range
 * @param {Date} endDate - End of time range
 * @returns {Array} Daily stats: [{ date, present, late, absent, total }]
 */
export const calculateDailyTrend = (attendanceData, startDate = null, endDate = null) => {
  if (!attendanceData || attendanceData.length === 0) return [];

  // Group by date
  const dailyStats = {};
  
  attendanceData.forEach(row => {
    const dateStr = row['Date'];
    if (!dateStr) return;
    
    const dateObj = new Date(dateStr);
    
    // Apply date range filter if provided
    if (startDate && dateObj < startDate) return;
    if (endDate && dateObj > endDate) return;
    
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = {
        date: dateStr,
        dateObj: dateObj,
        present: 0,
        late: 0,
        absent: 0,
        total: 0
      };
    }
    
    const status = row['Status'] || '';
    if (status.startsWith('Present')) {
      dailyStats[dateStr].present++;
      if (row.isLate) {
        dailyStats[dateStr].late++;
      }
    } else if (status === 'Absent') {
      dailyStats[dateStr].absent++;
    }
    
    dailyStats[dateStr].total++;
  });

  // Sort by date and return
  return Object.values(dailyStats).sort((a, b) => a.dateObj - b.dateObj);
};

/**
 * Calculate overall status distribution
 * @param {Array} summaryData - Employee summaries
 * @returns {Object} { present, late, absent, total }
 */
export const calculateStatusDistribution = (summaryData) => {
  if (!summaryData || summaryData.length === 0) {
    return { present: 0, late: 0, absent: 0, total: 0 };
  }

  const distribution = {
    present: 0,
    late: 0,
    absent: 0,
    total: 0
  };

  summaryData.forEach(emp => {
    distribution.present += (emp.present || 0);
    distribution.late += (emp.late || 0);
    distribution.absent += (emp.absent || 0);
  });

  distribution.total = distribution.present + distribution.absent;

  return distribution;
};

/**
 * Get top performers by attendance rate
 * @param {Array} summaryData - Employee summaries
 * @param {number} limit - Number of top employees (default 10)
 * @returns {Array} Sorted employees with attendance rate
 */
export const getTopPerformers = (summaryData, limit = 10) => {
  if (!summaryData || summaryData.length === 0) return [];

  const performers = summaryData.map(emp => {
    const total = (emp.present || 0) + (emp.absent || 0);
    const attendanceRate = total > 0 ? ((emp.present / total) * 100) : 0;
    
    return {
      name: emp.name,
      code: emp.code,
      attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal
      present: emp.present || 0,
      absent: emp.absent || 0,
      late: emp.late || 0,
      total
    };
  });

  // Sort by attendance rate (descending) and take top N
  return performers
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, limit);
};

/**
 * Calculate late arrival patterns by weekday
 * @param {Array} attendanceData - Raw attendance records
 * @returns {Array} [{ day: 'Mon', early: 5, medium: 3, severe: 2 }]
 */
export const calculateLatePatterns = (attendanceData) => {
  if (!attendanceData || attendanceData.length === 0) return [];

  const weekdayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const patterns = {
    'Mon': { day: 'Mon', early: 0, medium: 0, severe: 0 },
    'Tue': { day: 'Tue', early: 0, medium: 0, severe: 0 },
    'Wed': { day: 'Wed', early: 0, medium: 0, severe: 0 },
    'Thu': { day: 'Thu', early: 0, medium: 0, severe: 0 },
    'Fri': { day: 'Fri', early: 0, medium: 0, severe: 0 },
    'Sat': { day: 'Sat', early: 0, medium: 0, severe: 0 },
    'Sun': { day: 'Sun', early: 0, medium: 0, severe: 0 }
  };

  attendanceData.forEach(row => {
    if (!row.isLate || !row['Date'] || !row['InTime']) return;
    
    const dateObj = new Date(row['Date']);
    const dayName = weekdayMap[dateObj.getDay()];
    
    // Calculate how late (in minutes)
    const inTimeMinutes = parseTime(row['InTime']);
    const baseCutoff = 635; // 10:35 AM
    const lateMinutes = inTimeMinutes - baseCutoff;
    
    if (lateMinutes <= 15) {
      patterns[dayName].early++;  // 0-15 min late
    } else if (lateMinutes <= 30) {
      patterns[dayName].medium++; // 15-30 min late
    } else {
      patterns[dayName].severe++; // 30+ min late
    }
  });

  return Object.values(patterns);
};

/**
 * Calculate attendance trends (improving/declining)
 * Compares first half vs second half of the dataset
 * @param {Array} attendanceData - Raw attendance records
 * @returns {Object} { trend: 'up' | 'down' | 'stable', percentage: 2.5, direction: '↑' | '↓' | '→' }
 */
export const calculateTrend = (attendanceData) => {
  if (!attendanceData || attendanceData.length === 0) {
    return { trend: 'stable', percentage: 0, direction: '→' };
  }

  // Get daily trend data
  const dailyData = calculateDailyTrend(attendanceData);
  if (dailyData.length < 2) {
    return { trend: 'stable', percentage: 0, direction: '→' };
  }

  // Split into first half and second half
  const midpoint = Math.floor(dailyData.length / 2);
  const firstHalf = dailyData.slice(0, midpoint);
  const secondHalf = dailyData.slice(midpoint);

  // Calculate average attendance rate for each half
  const calcAvgRate = (data) => {
    const totalPresent = data.reduce((sum, day) => sum + day.present, 0);
    const totalRecords = data.reduce((sum, day) => sum + day.total, 0);
    return totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;
  };

  const firstHalfRate = calcAvgRate(firstHalf);
  const secondHalfRate = calcAvgRate(secondHalf);
  const change = secondHalfRate - firstHalfRate;

  // Determine trend
  let trend = 'stable';
  let direction = '→';
  
  if (change > 2) {
    trend = 'up';
    direction = '↑';
  } else if (change < -2) {
    trend = 'down';
    direction = '↓';
  }

  return {
    trend,
    percentage: Math.abs(Math.round(change * 10) / 10),
    direction
  };
};

