import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  calculateDailyTrend, 
  calculateStatusDistribution, 
  getTopPerformers, 
  calculateLatePatterns 
} from '../utils/attendanceUtils';

const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Green, Yellow, Red

const AnalyticsCharts = ({ attendanceData, summaryData }) => {
  const [timeRange, setTimeRange] = React.useState('1M');

  // Filter Logic
  const filteredDailyTrend = useMemo(() => {
    // Sort chronologically to find the last date in the dataset
    const sortedData = [...attendanceData].sort((a, b) => new Date(a['Date']) - new Date(b['Date']));
    const lastDate = sortedData.length > 0 ? new Date(sortedData[sortedData.length - 1]['Date']) : new Date();
    
    let daysToSubtract = 30;
    if (timeRange === '1W') daysToSubtract = 7;
    if (timeRange === '2W') daysToSubtract = 14;
    if (timeRange === '3W') daysToSubtract = 21;
    
    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    // Use the utility's built-in filtering
    return calculateDailyTrend(attendanceData, startDate, lastDate);
  }, [attendanceData, timeRange]);

  const statusDist = useMemo(() => calculateStatusDistribution(summaryData), [summaryData]);
  const latePatterns = useMemo(() => calculateLatePatterns(attendanceData), [attendanceData]);
  const topPerformers = useMemo(() => getTopPerformers(summaryData, 5), [summaryData]);

  const pieData = [
    { name: 'Present', value: statusDist.present, color: '#10b981' },
    { name: 'Late', value: statusDist.late, color: '#f59e0b' },
    { name: 'Absent', value: statusDist.absent, color: '#ef4444' }
  ];

  return (
    <div className="analytics-container fade-in">
      <div className="charts-grid">
        
        {/* Daily Trend Chart */}
        <div className="chart-card wide">
          <div className="chart-header-row">
            <h3>Daily Attendance Trend</h3>
            <div className="chart-filter-controls">
                {['1W', '2W', '3W', '1M'].map(range => (
                    <button
                        key={range}
                        className={`filter-pill ${timeRange === range ? 'active' : ''}`}
                        onClick={() => setTimeRange(range)}
                    >
                        {range}
                    </button>
                ))}
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredDailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid var(--border-color)', 
                    boxShadow: 'var(--shadow-premium)',
                    backgroundColor: 'var(--card-bg)',
                    backdropFilter: 'blur(10px)',
                    color: 'var(--text-dark)'
                  }}
                  itemStyle={{ color: 'var(--text-dark)' }}
                  labelStyle={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="present" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPresent)" 
                  name="Present"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="chart-card">
          <h3>Overall Status Distribution</h3>
          <div className="chart-wrapper flex-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Late Arrival Patterns */}
        <div className="chart-card">
          <h3>Late Arrival Patterns (By Day)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={latePatterns}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="early" name="0-15m" stackId="a" fill="#fcd34d" radius={[0, 0, 4, 4]} />
                <Bar dataKey="medium" name="15-30m" stackId="a" fill="#f59e0b" />
                <Bar dataKey="severe" name="30m+" stackId="a" fill="#b45309" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers List */}
        <div className="chart-card">
          <h3>Top Attendance Performers</h3>
          <div className="performers-list">
            {topPerformers.map((emp, idx) => (
              <div key={emp.code} className="performer-item">
                <div className="rank">#{idx + 1}</div>
                <div className="info">
                  <span className="name">{emp.name}</span>
                  <span className="rate">{emp.attendanceRate}% Attendance</span>
                </div>
                <div className="medal">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsCharts;
