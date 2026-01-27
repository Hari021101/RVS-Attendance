import React from 'react';

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
                const isSunday = dateObj.getDay() === 0;
                const override = getEventOverride(date);
                const category = override ? getEventCategory(override.type) : null;

                return (
                  <tr key={date} className={`matrix-row ${isSunday ? 'weekend-row' : ''} ${override ? 'event-row' : ''}`}>
                    <td className="sticky-date-cell">
                        {date}
                        {isSunday && !override && <span className="weekend-tag">SUN</span>}
                        {override && <span className={`event-tag ${category}`}>EVENT</span>}
                    </td>
                    {override ? (
                        <td colSpan={employees.length} className="event-display-cell">
                             <div className={`event-banner ${category}`}>
                                <span className="event-text">{override.label.toUpperCase()}</span>
                             </div>
                        </td>
                    ) : isSunday ? (
                        <td colSpan={employees.length} className="weekend-display-cell">
                            <div className="weekend-banner">
                                <span className="weekend-text">WEEK-END</span>
                            </div>
                        </td>
                    ) : (
                        employees.map(name => {
                            const record = matrix[date][name];
                            const inTime = record?.inTime;
                            const isLate = record?.isLate;
                            const isAbsent = record?.status === 'Absent';
                            const hasRecord = !!record;

                            return (
                                <td key={name} className="matrix-cell">
                                    {hasRecord ? (
                                        <div className={`time-pill ${isLate ? 'late' : isAbsent ? 'absent' : 'ontime'}`}>
                                            <span className="time">{isAbsent ? 'ABSENT' : inTime}</span>
                                            {isLate && <span className="late-indicator">!</span>}
                                        </div>
                                    ) : (
                                        <span className="no-record">-</span>
                                    )}
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
