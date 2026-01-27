import React from 'react';

const AttendanceTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="table-container">
      <h3>Daily Details</h3>
      <table className="attendance-table">
        <thead>
          <tr>
            <th>E. Code</th>
            <th>Name</th>
            <th>Date</th>
            <th>In Time</th>
            <th>Out Time</th>
            <th>Late Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
             // Basic filtering
             if (!row['E. Code'] || !row['Name']) return null;

             const isAbsent = row['Status'] === 'Absent';
             const isPresent = row['Status'] === 'Present';
             const isLate = row['isLate'];
             
            return (
              <tr key={index} className={isAbsent ? 'row-absent' : isPresent ? 'row-present' : ''}>
                <td>{row['E. Code']}</td>
                <td className="name-cell">{row['Name']}</td>
                <td>{row['Attendance Date'] || row['Date'] || ''}</td>
                <td>{row['InTime'] || '-'}</td>
                <td>{row['OutTime'] || '-'}</td>
                <td>
                  {isLate ? (
                    <span className="late-badge">LATE</span>
                  ) : isAbsent ? (
                    <span className="status-badge absent">Absent</span>
                  ) : (
                    <span className="status-badge present">On Time</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
