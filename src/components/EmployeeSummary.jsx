import React from 'react';

const EmployeeSummary = ({ summaryData }) => {
  if (!summaryData || summaryData.length === 0) return null;

  return (
    <div className="table-container summary-table-container">
      <h3>Employee Summary Report</h3>
      <table className="attendance-table summary-table">
        <thead>
          <tr>
            <th>Employee Code</th>
            <th>Name</th>
            <th>Total Present Days</th>
            <th>Total Absent Days</th>
            <th>Total Late Days</th>
          </tr>
        </thead>
        <tbody>
          {summaryData.map((emp, index) => (
            <tr key={index}>
              <td>{emp.code}</td>
              <td>{emp.name}</td>
              <td className="text-center font-bold">{emp.present}</td>
              <td className="text-center font-bold text-absent">{emp.absent}</td>
              <td className={`text-center font-bold ${emp.late > 0 ? 'text-late' : ''}`}>
                {emp.late}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeSummary;
