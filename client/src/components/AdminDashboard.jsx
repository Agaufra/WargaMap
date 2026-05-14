import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PRIORITY_COLORS = {
  'Low': '#10b981',
  'Medium': '#f59e0b',
  'High': '#ef4444',
  'Critical': '#7f1d1d'
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading analytics...</div>;
  if (!stats) return <div style={{ padding: '2rem', color: 'red' }}>Failed to load stats.</div>;

  const categoryData = stats.byCategory.map(item => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.count
  }));

  const priorityData = stats.byPriority.map(item => ({
    name: item.priorityLevel,
    value: item.count
  }));

  return (
    <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>System Analytics</h1>
        
        <div className="admin-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card glass-panel">
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reports</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          
          <div className="stat-card glass-panel">
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Issues</div>
            <div className="stat-value" style={{ color: 'var(--priority-critical)' }}>
              {stats.byPriority.find(p => p.priorityLevel === 'Critical')?.count || 0}
            </div>
          </div>
          
          <div className="stat-card glass-panel">
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Issues</div>
            <div className="stat-value" style={{ color: 'var(--priority-high)' }}>
              {stats.byStatus.filter(s => s.status !== 'Resolved').reduce((sum, item) => sum + item.count, 0)}
            </div>
          </div>
        </div>
        
        <div className="admin-grid" style={{ paddingTop: '0' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Reports by Category</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Priority Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="value">
                   {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
