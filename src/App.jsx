import { useState } from 'react';
import ExcelReader from './components/ExcelReader';
import AttendanceDashboard from './components/AttendanceDashboard';
import { processAttendanceData } from './utils/attendanceUtils';
import './App.css';

function App() {
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
    <div className="app-container">
      <header className="app-header">
        <h1>RVS Attendance Monitor</h1>
        <p className="subtitle">Team Fingerprint Punch Details</p>
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

export default App;

