import React from 'react';

// Helper to generate initials
const getInitials = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper to generate consistent color from string
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const EmployeeSummary = ({ summaryData }) => {
  if (!summaryData || summaryData.length === 0) return null;

  return (
    <div className="summary-card fade-in">
      <div className="summary-header">
        <div className="header-icon-wrapper">
            <span className="icon">📋</span>
        </div>
        <div>
            <h3>Employee Summary Report</h3>
            <p className="subtitle">Performance & Attendance Overview</p>
        </div>
      </div>

      <div className="summary-table-wrapper">
        <table className="summary-table-premium">
            <thead>
            <tr>
                <th>Employee</th>
                <th>Performance</th>
                <th className="text-center">Present</th>
                <th className="text-center">Absent</th>
                <th className="text-center">Late</th>
            </tr>
            </thead>
            <tbody>
            {summaryData.map((emp, index) => {
                const totalDays = emp.present + emp.absent; // Simplified total
                const presentPercentage = totalDays > 0 ? Math.round((emp.present / totalDays) * 100) : 0;
                const avatarColor = stringToColor(emp.name);
                
                return (
                <tr key={index}>
                    <td>
                        <div className="employee-info-cell">
                            <div 
                                className="employee-avatar" 
                                style={{ backgroundColor: avatarColor }}
                            >
                                {getInitials(emp.name)}
                            </div>
                            <div className="employee-details">
                                <span className="name">{emp.name}</span>
                                <span className="code">{emp.code}</span>
                            </div>
                        </div>
                    </td>
                    <td className="performance-cell">
                        <div className="attendance-bar-container">
                            <div className="bar-label">
                                <span>Attendance Rate</span>
                                <span className="percentage">{presentPercentage}%</span>
                            </div>
                            <div className="progress-bg">
                                <div 
                                    className={`progress-fill ${presentPercentage >= 90 ? 'high' : presentPercentage >= 75 ? 'medium' : 'low'}`}
                                    style={{ width: `${presentPercentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </td>
                    <td className="text-center">
                        <span className="sc-badge present">{emp.present} Days</span>
                    </td>
                    <td className="text-center">
                        <span className={`sc-badge ${emp.absent > 0 ? 'absent' : 'neutral'}`}>{emp.absent} Days</span>
                    </td>
                    <td className="text-center">
                        <span className={`sc-badge ${emp.late > 0 ? 'late' : 'neutral'}`}>{emp.late} Days</span>
                    </td>
                </tr>
                );
            })}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeSummary;
