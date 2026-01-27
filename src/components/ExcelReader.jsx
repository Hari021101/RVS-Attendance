import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const ExcelReader = ({ onFileLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const processFile = (file) => {
    if (!file) return;

    // Validate type (basic check)
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setLoading(true);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let allRecords = [];
        let currentDate = null;
        
        // Scan through all rows
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          
          const firstCell = row[0] ? row[0].toString().trim() : '';
          const secondCell = row[1] ? row[1].toString().trim() : '';
          const thirdCell = row[2] ? row[2].toString().trim() : '';
          
          // Check if any of the first 3 cells contains "Attendance Date"
          let dateCell = -1;
          if (firstCell.toLowerCase() === 'attendance date') dateCell = 0;
          else if (secondCell.toLowerCase() === 'attendance date') dateCell = 1;
          else if (thirdCell.toLowerCase() === 'attendance date') dateCell = 2;
          
          if (dateCell >= 0) {
            // Found "Attendance Date" - extract the date from subsequent cells
            console.log('Found "Attendance Date" at cell index', dateCell);
            for (let j = dateCell + 1; j < Math.min(row.length, dateCell + 10); j++) {
              if (row[j] && row[j].toString().trim().length > 0) {
                currentDate = row[j].toString().trim();
                console.log('Extracted date:', currentDate, 'from cell index', j);
                break;
              }
            }
            continue;
          }
          
          // Check if this is a header row (contains "SNo" and "E. Code")
          const isHeaderRow = row.some(cell => 
            cell && cell.toString().includes('SNo')
          );
          
          if (isHeaderRow) {
            // This is a header row, next rows will be data
            // Extract column positions
            const headers = row.map(cell => cell ? cell.toString().trim() : '');
            const eCodeIdx = headers.findIndex(h => h && (h.includes('E. Code') || h.includes('Emp Code')));
            const nameIdx = headers.findIndex(h => h && h === 'Name');
            const inTimeIdx = headers.findIndex(h => h && (h.includes('InTime') || h.includes('In Time')));
            const outTimeIdx = headers.findIndex(h => h && (h.includes('OutTime') || h.includes('Out Time')));
            const statusIdx = headers.findIndex(h => h && h === 'Status');
            
            // Process subsequent data rows until we hit another header or date
            let j;
            for (j = i + 1; j < data.length; j++) {
              const dataRow = data[j];
              if (!dataRow || dataRow.length === 0) continue;
              
              const firstDataCell = dataRow[0] ? dataRow[0].toString().trim() : '';
              const secondDataCell = dataRow[1] ? dataRow[1].toString().trim() : '';
              
              // Stop if we hit another "Attendance Date" or header
              if (firstDataCell.toLowerCase() === 'attendance date' || 
                  secondDataCell.toLowerCase() === 'attendance date' ||
                  firstDataCell === 'SNo') {
                break;
              }
              
              // Extract employee data
              const eCode = dataRow[eCodeIdx];
              const name = dataRow[nameIdx];
              
              // Skip if no employee code or if it's a header value
              if (!eCode || eCode === 'E. Code' || eCode === 'SNo') continue;
              
              const record = {
                'E. Code': eCode ? eCode.toString().trim() : '',
                'Name': name ? name.toString().trim() : '',
                'InTime': dataRow[inTimeIdx] ? dataRow[inTimeIdx].toString().trim() : '',
                'OutTime': dataRow[outTimeIdx] ? dataRow[outTimeIdx].toString().trim() : '',
                'Status': dataRow[statusIdx] ? dataRow[statusIdx].toString().trim() : '',
                'Attendance Date': currentDate || ''
              };
              
              allRecords.push(record);
            }
            // Advance the outer loop to skip processed rows
            i = j - 1;
          }
        }
        
        console.log('Total records extracted:', allRecords.length);
        console.log('Sample records:', allRecords.slice(0, 3));
        
        onFileLoaded(allRecords);

      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="excel-reader-container">
      <div 
        className={`upload-box ${isDragActive ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label htmlFor="file-upload" className="custom-file-upload">
            <div className="icon">📂</div>
            <div className="text">
                {loading ? 'Processing...' : 'Click to Upload or Drag File Here'}
            </div>
            {fileName && <p className="file-name-tag">Selected: {fileName}</p>}
        </label>
        <input 
          id="file-upload" 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange} 
        />
      </div>
    </div>
  );
};

export default ExcelReader;
