import React, { useMemo } from 'react';

const GroupedAttendance = ({ data }) => {
  // Group data by Employee Code
  const groupedData = useMemo(() => {
    if (!data) return {};
    
    return data.reduce((groups, row) => {
      // Key can be E. Code or Name. Using Code is safer for uniqueness.
      const key = row['E. Code'];
      if (!key) return groups;

      if (!groups[key]) {
        groups[key] = {
          code: key,
          name: row['Name'],
          records: []
        };
      }
      
      groups[key].records.push(row);
      return groups;
    }, {});
  }, [data]);

  if (!data || data.length === 0) return null;

  const employeeKeys = Object.keys(groupedData);

  return (
    <div className="grouped-container">
      {employeeKeys.map((key) => {
        const employee = groupedData[key];
        
        // Calculate stats for this specific employee
        const stats = employee.records.reduce((acc, text) => {
            if (text['Status'].startsWith('Present')) acc.present++;
            if (text['Status'] === 'Absent') acc.absent++;
            if (text['isLate']) acc.late++;
            return acc;
        }, { present: 0, absent: 0, late: 0 });

        return (
          <div key={key} className="employee-group-card">
            <div className="employee-header">
              <div className="header-top">
                 <h3>{employee.name} <span className="code-tag">#{employee.code}</span></h3>
              </div>
              <div className="header-stats">
                  <span className="stat-pill present">Present: {stats.present}</span>
                  <span className="stat-pill absent">Absent: {stats.absent}</span>
                  <span className="stat-pill late">Late: {stats.late}</span>
              </div>
            </div>
            
            <div className="table-responsive-wrapper">
                <table className="attendance-table mini-table">
                <thead>
                    <tr>
                    <th>Date</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {employee.records.map((row, idx) => {
                    const isAbsent = row['Status'] === 'Absent';
                    const isLate = row['isLate'];
                    const isNoOut = row['Status'].includes('No Out');
                    
                    return (
                        <tr key={idx}>
                        <td>{row['Attendance Date'] || row['Date'] || '-'}</td>
                        <td>{row['InTime'] || '-'}</td>
                        <td>{row['OutTime'] || '-'}</td>
                        <td>
                            {isLate ? (
                            <span className="late-badge">LATE</span>
                            ) : isAbsent ? (
                            <span className="status-badge absent">Absent</span>
                            ) : isNoOut ? (
                            <span className="status-badge warning">No Out Punch</span>
                            ) : (
                             // Only show "On Time" if they are purely present and not late
                             row['Status'] === 'Present' ? 
                             <span className="status-badge present">On Time</span> : 
                             <span className="status-badge">{row['Status']}</span>
                            )}
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupedAttendance;
