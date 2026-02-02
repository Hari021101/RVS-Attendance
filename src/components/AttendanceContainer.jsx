import { useState } from 'react';
import ExcelReader from './ExcelReader';
import AttendanceDashboard from './AttendanceDashboard';
import ThemeToggle from './ThemeToggle';
import { processAttendanceData } from '../utils/attendanceUtils';

function AttendanceContainer() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [teamStats, setTeamStats] = useState(null);
  const [viewMode, setViewMode] = useState('summary');
  const [eventOverrides, setEventOverrides] = useState([]); // Array of { date, label, type }

  const handleFileLoaded = (data) => {
    const { processedData, summaryData, stats } = processAttendanceData(data);
    setAttendanceData(processedData);
    setSummaryData(summaryData);
    setTeamStats(stats);
  };

  const handleReset = () => {
    setAttendanceData([]);
    setSummaryData([]);
    setTeamStats(null);
    setEventOverrides([]);
  };

  const handleAddOverride = (override) => {
    setEventOverrides(prev => [...prev, override]);
  };

  const handleRemoveOverride = (date) => {
    setEventOverrides(prev => prev.filter(o => o.date !== date));
  };

  return (
    <div className="attendance-container">
      <header className="app-header">
        <div className="header-content">
            <div>
                <h1>RVS Attendance Monitor</h1>
                <p className="subtitle">Team Fingerprint Punch Details</p>
            </div>
            <ThemeToggle />
        </div>
      </header>

      <main className="dashboard">
        {attendanceData.length === 0 ? (
          <div className="upload-section">
            <div className="empty-state">
              <ExcelReader onFileLoaded={handleFileLoaded} />
              <p>Please upload the attendance Excel file.</p>
            </div>
          </div>
        ) : (
          <AttendanceDashboard 
            attendanceData={attendanceData}
            summaryData={summaryData}
            teamStats={teamStats}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onReset={handleReset}
            eventOverrides={eventOverrides}
            onAddOverride={handleAddOverride}
            onRemoveOverride={handleRemoveOverride}
          />
        )}
      </main>
    </div>
  );
}

export default AttendanceContainer;
