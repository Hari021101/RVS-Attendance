import React from 'react';
import { calculateTrend } from '../utils/attendanceUtils';

const MetricsCards = ({ attendanceData, summaryData }) => {
  // Calculate specific metrics
  const totalEmployees = summaryData.length;
  
  // Average Attendance Rate
  const totalPresent = summaryData.reduce((sum, emp) => sum + (emp.present || 0), 0);
  const totalRecords = summaryData.reduce((sum, emp) => sum + (emp.present || 0) + (emp.absent || 0), 0);
  const avgAttendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : 0;

  // Average Late Count per Day
  const totalLate = summaryData.reduce((sum, emp) => sum + (emp.late || 0), 0);
  const uniqueDates = new Set(attendanceData.map(r => r.Date)).size;
  const avgLatePerDay = uniqueDates > 0 ? (totalLate / uniqueDates).toFixed(1) : 0;

  // Trend
  const trendData = calculateTrend(attendanceData);

  // Best Attendance Day (Simple calculation)
  const dailyCounts = {};
  attendanceData.forEach(r => {
    if (r.Status === 'Present' || r.Status.startsWith('Present')) {
      dailyCounts[r.Date] = (dailyCounts[r.Date] || 0) + 1;
    }
  });
  let maxPresent = 0;
  let bestDay = '-';
  Object.entries(dailyCounts).forEach(([date, count]) => {
    if (count > maxPresent) {
      maxPresent = count;
      bestDay = new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
  });

  return (
    <div className="metrics-grid">
      {/* Attendance Rate Card */}
      <div className="metric-card glass-panel">
        <div className="metric-icon rate-icon">📊</div>
        <div className="metric-content">
          <span className="metric-label">Avg Attendance</span>
          <div className="metric-value-group">
            <span className="metric-value">{avgAttendanceRate}%</span>
            <span className={`metric-trend ${trendData.trend}`}>
              {trendData.direction} {trendData.percentage}%
            </span>
          </div>
          <span className="metric-sub">vs last period</span>
        </div>
      </div>

      {/* Late Arrivals Card */}
      <div className="metric-card glass-panel">
        <div className="metric-icon late-icon">⏰</div>
        <div className="metric-content">
          <span className="metric-label">Avg Late / Day</span>
          <div className="metric-value-group">
            <span className="metric-value">{avgLatePerDay}</span>
          </div>
          <span className="metric-sub">employees per day</span>
        </div>
      </div>

      {/* Best Day Card */}
      <div className="metric-card glass-panel">
        <div className="metric-icon star-icon">🌟</div>
        <div className="metric-content">
          <span className="metric-label">Best Day</span>
          <div className="metric-value-group">
            <span className="metric-value text-md">{bestDay}</span>
          </div>
          <span className="metric-sub">{maxPresent} employees present</span>
        </div>
      </div>

      {/* Total Workforce */}
      <div className="metric-card glass-panel">
        <div className="metric-icon user-icon">👥</div>
        <div className="metric-content">
          <span className="metric-label">Total Workforce</span>
          <div className="metric-value-group">
            <span className="metric-value">{totalEmployees}</span>
          </div>
          <span className="metric-sub">active employees</span>
        </div>
      </div>
    </div>
  );
};

export default MetricsCards;
