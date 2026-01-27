import React from 'react';

const ViewToggle = ({ viewMode, setViewMode }) => {
  return (
    <div className="view-toggle">
        <button 
        className={`toggle-btn ${viewMode === 'summary' ? 'active' : ''}`}
        onClick={() => setViewMode('summary')}
        >
        Summary View
        </button>
        <button 
        className={`toggle-btn ${viewMode === 'detailed' ? 'active' : ''}`}
        onClick={() => setViewMode('detailed')}
        >
        Detailed View
        </button>
    </div>
  );
};

export default ViewToggle;
