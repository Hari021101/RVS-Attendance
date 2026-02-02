import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import StatsCards from './StatsCards';
import ViewToggle from './ViewToggle';
import EmployeeSummary from './EmployeeSummary';
import DateGroupedAttendance from './DateGroupedAttendance';
import AnalyticsCharts from './AnalyticsCharts';
import { exportComprehensiveExcel, exportComprehensivePDF } from '../utils/exportUtils';
import { calculateMatrixData } from '../utils/attendanceUtils';

const AttendanceDashboard = ({ 
  attendanceData, 
  summaryData, 
  teamStats, 
  viewMode, 
  setViewMode, 
  onReset,
  eventOverrides = [],
  onAddOverride,
  onRemoveOverride
}) => {
  const [newEvent, setNewEvent] = useState({ date: new Date(), label: '', type: '' });
  const [colFilters, setColFilters] = useState({});

  // Compute matrix data for both UI and Export
  const matrixData = useMemo(() => {
    return calculateMatrixData(attendanceData, colFilters, eventOverrides);
  }, [attendanceData, colFilters, eventOverrides]);
  
  const handleExport = async (type) => {
    const datasets = [
      { data: summaryData, sheetName: 'Employee Summary', title: 'Employee Attendance Summary' },
      { 
        data: matrixData, // Pass the full matrix object
        sheetName: 'Monthly Matrix', 
        title: 'Monthly Attendance Matrix',
        isMatrix: true 
      }
    ];

    if (type === 'excel') {
      await exportComprehensiveExcel(datasets, 'Attendance_Full_Report.xlsx', eventOverrides);
    } else {
      exportComprehensivePDF(datasets, 'Attendance Full Report', 'Attendance_Full_Report.pdf', eventOverrides);
    }
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEvent.date || !newEvent.label) return;
    
    // Timezone-safe date string format (YYYY-MM-DD)
    const year = newEvent.date.getFullYear();
    const month = String(newEvent.date.getMonth() + 1).padStart(2, '0');
    const day = String(newEvent.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    onAddOverride({ ...newEvent, date: dateStr });
    setNewEvent({ date: new Date(), label: '', type: '' });
  };

  const handleFilterChange = (empName, status) => {
    setColFilters(prev => ({
      ...prev,
      [empName]: status
    }));
  };

  const clearFilters = () => setColFilters({});

  return (
    <div className="dashboard-content">
      <div className="stats-section">
        <StatsCards teamStats={teamStats} />
      </div>

      <div className="attendance-section">
        <div className="section-header">
          <h2>Attendance Report</h2>
          <div className="actions">
            <div className="export-group">
                <button className="export-btn excel" onClick={() => handleExport('excel')}>
                    Excel
                </button>
                <button className="export-btn pdf" onClick={() => handleExport('pdf')}>
                    PDF
                </button>
            </div>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            <button className="reset-btn" onClick={onReset}>
              Upload New
            </button>
          </div>
        </div>

        {viewMode === 'detailed' && (
          <div className="event-manager-section top-manager premium-control-panel">
            <div className="event-manager-header">
                <div className="text-content">
                    <h3><span className="header-icon">🛠️</span> Event Manager</h3>
                </div>
                {eventOverrides.length > 0 && (
                    <div className="event-chips-container mini">
                        {eventOverrides.map((over, idx) => (
                        <div key={idx} className={`event-chip ${over.type.toLowerCase().includes('holiday') ? 'holiday' : 'team-out'}`}>
                            <span className="chip-icon">{over.type.toLowerCase().includes('holiday') ? '🏖️' : '👥'}</span>
                            <span className="chip-label">{over.label} {over.type && `(${over.type})`}</span>
                            <button className="remove-chip" onClick={() => onRemoveOverride(over.date)}>×</button>
                        </div>
                        ))}
                    </div>
                )}
            </div>
            
            <form className="event-form modern-grid" onSubmit={handleAddEvent}>
              <div className="form-group premium-picker">
                <label><span className="input-icon">📅</span> Select Date</label>
                <DatePicker 
                  selected={newEvent.date} 
                  onChange={(date) => setNewEvent({...newEvent, date: date})}
                  dateFormat="dd MMM yyyy"
                  className="premium-date-input"
                  popperPlacement="bottom-start"
                  placeholderText="Click to pick"
                />
              </div>
              <div className="form-group">
                <label><span className="input-icon">🏷️</span> Event Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Christmas" 
                  value={newEvent.label} 
                  onChange={(e) => setNewEvent({...newEvent, label: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label><span className="input-icon">📂</span> Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. Holiday or Team OT" 
                  value={newEvent.type} 
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="add-event-btn primary-action">
                    <span className="btn-icon">＋</span> Add to Matrix
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          {viewMode === 'summary' ? (
            <EmployeeSummary summaryData={summaryData} />
          ) : viewMode === 'analytics' ? (
            <AnalyticsCharts attendanceData={attendanceData} summaryData={summaryData} />
          ) : (
            <DateGroupedAttendance 
              data={attendanceData} 
              matrixData={matrixData}
              colFilters={colFilters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              eventOverrides={eventOverrides}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
