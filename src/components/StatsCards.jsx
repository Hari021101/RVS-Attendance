import React from 'react';

const StatsCards = ({ teamStats }) => {
  if (!teamStats) return null;

  return (
    <div className="stats-cards">
      <div className="card">
        <div className="icon-orb">👥</div>
        <h3>Total Employees</h3>
        <div className="number">{teamStats.totalEmployees || 0}</div>
      </div>
      <div className="card present">
        <div className="icon-orb">✅</div>
        <h3>Total Present</h3>
        <div className="number">{teamStats.present || 0}</div>
      </div>
      <div className="card absent">
        <div className="icon-orb">❌</div>
        <h3>Total Absent</h3>
        <div className="number">{teamStats.absent || 0}</div>
      </div>
      <div className="card late">
        <div className="icon-orb">⚠️</div>
        <h3>Late Arrivals</h3>
        <div className="number">{teamStats.late || 0}</div>
      </div>
    </div>
  );
};

export default StatsCards;
