import React from 'react';
import { formatTimeToAMPM } from '../utils/attendanceUtils';

const DateGroupedAttendance = ({ 
  data, 
  matrixData, 
  colFilters = {}, 
  onFilterChange, 
  onClearFilters, 
  eventOverrides = [] 
}) => {
  if (!data || data.length === 0) return null;
  if (!matrixData) return <div>Loading...</div>;

  const { dates, employees, matrix } = matrixData;
  const hasActiveFilters = Object.values(colFilters).some(v => v !== 'all');

  // Helper to categorize theme based on keywords
  const getEventCategory = (type = '') => {
    const text = type.toLowerCase();
    if (text.includes('holiday') || text.includes('leave') || text.includes('vacation') || text.includes('off')) {
      return 'holiday';
    }
    return 'team-out'; // Default theme
  };

  // Helper to find override for a date
  const getEventOverride = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    
    // Construct local YYYY-MM-DD string
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const targetDate = `${year}-${month}-${day}`;
    
    return eventOverrides.find(o => o.date === targetDate);
  };

  return (
    <section className="matrix-view-section">
      <div className="matrix-card-glass">
        <div className="matrix-header-bar">
          <div className="matrix-title">
            <span className="icon">🔍</span>
            <h3>Monthly Attendance Matrix</h3>
            {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={onClearFilters}>
                    Clear All Filters
                </button>
            )}
          </div>
          <div className="matrix-legend-premium">
            <div className="legend-item"><span className="dot ontime"></span> On Time</div>
            <div className="legend-item"><span className="dot late"></span> Late Arrival</div>
            <div className="legend-item"><span className="dot absent"></span> Absent</div>
          </div>
        </div>

        <div className="matrix-scroll-container">
          <table className="matrix-table-premium">
            <thead>
              <tr>
                <th className="sticky-corner">Date ({dates.length})</th>
                {employees.map(name => (
                  <th key={name} className="employee-header-cell">
                    <div className="header-slot">
                        <span className="emp-name">{name}</span>
                        <select 
                            className={`col-filter-select ${colFilters[name] && colFilters[name] !== 'all' ? 'active' : ''}`}
                            value={colFilters[name] || 'all'}
                            onChange={(e) => onFilterChange(name, e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="ontime">On Time</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                        </select>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map(date => {
                const dateObj = new Date(date);
                const isWeekendDay = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const override = getEventOverride(date);
                const category = override ? getEventCategory(override.type) : null;
                const eventLabel = override ? override.label.toUpperCase() : "WEEK-END";

                // Check if anyone worked on this specific holiday/weekend
                const anyEmployeeWorked = employees.some(name => {
                    const record = matrix[date][name];
                    return record && !['Absent', '-', 'Holiday', 'Weekend'].includes(record.status);
                });

                const isAutoHoliday = employees.every(name => {
                    const record = matrix[date][name];
                    return record && record.status === 'Holiday';
                });

                const isAutoWeekend = employees.every(name => {
                    const record = matrix[date][name];
                    return record && record.status === 'Weekend';
                });

                const isDisplayWeekend = (isWeekendDay || isAutoWeekend) && !anyEmployeeWorked;
                const showBanner = (override || isDisplayWeekend || isAutoHoliday) && !anyEmployeeWorked;
                const finalCategory = category || (isAutoHoliday ? 'holiday' : null);
                const finalEventLabel = override ? override.label.toUpperCase() : (isAutoHoliday ? 'HOLIDAY' : "WEEK-END");

                return (
                  <tr key={date} className={`matrix-row ${isDisplayWeekend && !override && !isAutoHoliday ? 'weekend-row' : ''} ${override || isAutoHoliday ? 'event-row' : ''}`}>
                    <td className="sticky-date-cell">
                        {date}
                        {isDisplayWeekend && !override && !isAutoHoliday && <span className="weekend-tag">{dateObj.getDay() === 0 ? 'SUN' : 'SAT'}</span>}
                        {(override || isAutoHoliday) && <span className={`event-tag ${finalCategory}`}>EVENT</span>}
                    </td>
                    {showBanner ? (
                        <td colSpan={employees.length} className={override || isAutoHoliday ? "event-display-cell" : "weekend-display-cell"}>
                             <div className={override || isAutoHoliday ? `event-banner ${finalCategory}` : "weekend-banner"}>
                                <span className={override || isAutoHoliday ? "event-text" : "weekend-text"}>{finalEventLabel}</span>
                             </div>
                        </td>
                    ) : (
                        employees.map(name => {
                            const record = matrix[date][name];
                            const inTime = record?.inTime;
                            const isLate = record?.isLate;
                            const isNonWorkingAbsence = (isDisplayWeekend || override || isAutoHoliday) && (record?.status === 'Absent' || record?.status === 'Holiday' || record?.status === 'Weekend' || !record);
                            const isRegularAbsent = !isNonWorkingAbsence && (record?.status === 'Absent' || record?.status === 'Holiday' || !record);
                            
                            // On non-working days, non-arrivals show the label instead of ABSENT
                            const displayValue = isNonWorkingAbsence 
                                ? finalEventLabel 
                                : isRegularAbsent ? 'ABSENT' : formatTimeToAMPM(inTime);

                            let pillClass = 'ontime';
                            if (isNonWorkingAbsence) pillClass = 'event-muted';
                            else if (isRegularAbsent) pillClass = 'absent';
                            else if (isLate) pillClass = 'late';

                            return (
                                <td key={name} className="matrix-cell">
                                    <div className={`time-pill ${pillClass}`}>
                                        <span className="time">{displayValue}</span>
                                        {isLate && <span className="late-indicator">!</span>}
                                    </div>
                                </td>
                            );
                        })
                    )}
                  </tr>
                );
              })}
              {dates.length === 0 && (
                <tr>
                    <td colSpan={employees.length + 1} className="no-results-cell">
                        No records match the current filters.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default DateGroupedAttendance;
