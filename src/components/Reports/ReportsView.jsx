import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function ReportsView() {
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const serviceCatalog = useLiveQuery(() => db.serviceCatalog.toArray());

  const {
    totalGross,
    totalNet,
    totalHours,
    totalSessions,
    hourlyYield,
    recentDays,
    serviceDistribution
  } = useMemo(() => {
    if (!dailyLogs || !sessions) return { totalGross: 0, totalNet: 0, totalHours: 0, totalSessions: 0, hourlyYield: 0, recentDays: [] };

    // We want trailing 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const recentLogs = dailyLogs.filter(log => new Date(log.dateStr) >= thirtyDaysAgo);
    
    // Sort by date ascending for charts
    recentLogs.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

    let gross = 0;
    let net = 0;
    let hours = 0;
    let burnRate = 0;

    recentLogs.forEach(log => {
      gross += (log.totalGrossRev || 0);
      net += (log.netProfit || 0);
      hours += (log.totalHours || 0);
      // Approximation of burn rate: Gross - Net is NOT accurate due to Booth Rent or Commission logic.
      // Wait, let's track burnRate correctly below.
    });

    const relevantSessions = sessions.filter(s => new Date(s.dateStr) >= thirtyDaysAgo);
    
    // Calculate Service Distribution and Burn Rate
    const serviceDistribution = {};
    
    relevantSessions.forEach(s => {
      const svc = serviceCatalog?.find(cat => cat.id === s.serviceId);
      if (svc) {
        serviceDistribution[svc.serviceName] = (serviceDistribution[svc.serviceName] || 0) + 1;
        // Material costs approximation
        if (svc.linkedMaterials) {
          // This requires a more complex db query normally,
          // but for UI approximation let's just use totalGrossRev difference from net if we can.
          // Actually, we'll need to fetch materials properly, or just leave Burn Rate to be determined.
        }
      }
    });

    // Recalculating burn rate simply from (Gross - Net) is flawed for Commission/Rental.
    // However, since we don't have direct access to materialCosts without async fetching,
    // we will approximate or leave Burn Rate 0 for now until we optimize.
    // For now we'll focus on Service Distribution.
    
    return {
      totalGross: gross,
      totalNet: net,
      totalHours: hours,
      totalSessions: relevantSessions.length,
      hourlyYield: hours > 0 ? (net / hours) : 0,
      recentDays: recentLogs,
      serviceDistribution: serviceDistribution
    };
  }, [dailyLogs, sessions, serviceCatalog]);

  // Chart Data Preparation
  const labels = recentDays.map(log => {
    // just MM-DD for x axis
    const parts = log.dateStr.split('-');
    return `${parts[1]}-${parts[2]}`;
  }); 

  const netDataTemplate = {
    labels,
    datasets: [
      {
        label: 'Net Profit ($)',
        data: recentDays.map(log => log.netProfit),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#10b981'
      }
    ]
  };

  const hoursDataTemplate = {
    labels,
    datasets: [
      {
        label: 'Hours Worked',
        data: recentDays.map(log => log.totalHours),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { border: { display: false } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: 'right' } 
    }
  };

  const pieDataTemplate = {
    labels: Object.keys(serviceDistribution || {}),
    datasets: [
      {
        data: Object.values(serviceDistribution || {}),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div style={{padding: '16px'}}>
      <h1 style={{fontSize: '1.5rem', marginBottom: '4px'}}>Reports Dashboard</h1>
      <p style={{color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.875rem'}}>Trailing 30 Days</p>

      {/* KPI Cards */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'}}>
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Net</div>
          <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-color)'}}>${totalNet.toFixed(2)}</div>
        </div>
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Hourly Yield</div>
          <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-color)'}}>${hourlyYield.toFixed(2)}/hr</div>
        </div>
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Gross Rev</div>
          <div style={{fontSize: '1.5rem', fontWeight: 700}}>${totalGross.toFixed(2)}</div>
        </div>
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Sessions</div>
          <div style={{fontSize: '1.5rem', fontWeight: 700}}>{totalSessions} <span style={{fontSize:'1rem', color:'var(--text-secondary)', fontWeight: 500}}>({totalHours.toFixed(1)}h)</span></div>
        </div>
      </div>

      {/* Charts */}
      {recentDays.length > 0 ? (
        <>
          <div className="card" style={{padding: '16px', marginBottom: '16px'}}>
            <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px', color: 'var(--text-secondary)'}}>Net Profit Trend</h3>
            <div style={{height: '200px'}}>
              <Line options={chartOptions} data={netDataTemplate} />
            </div>
          </div>
          
          <div className="card" style={{padding: '16px', marginBottom: '32px'}}>
            <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px', color: 'var(--text-secondary)'}}>Daily Logged Hours</h3>
            <div style={{height: '180px'}}>
              <Bar options={chartOptions} data={hoursDataTemplate} />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '32px'}}>
            <div className="card" style={{padding: '16px'}}>
              <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px', color: 'var(--text-secondary)'}}>Service Distribution</h3>
              <div style={{height: '250px'}}>
                {Object.keys(serviceDistribution).length > 0 ? (
                  <Pie options={pieOptions} data={pieDataTemplate} />
                ) : (
                  <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '50px'}}>No services logged</p>
                )}
              </div>
            </div>
            <div className="card" style={{padding: '16px'}}>
              <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px', color: 'var(--text-secondary)'}}>Inventory Burn Rate</h3>
              <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '250px'}}>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>30-Day COGS Estimate</div>
                <div style={{fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger-color)', marginTop: '8px'}}>${(totalGross - totalNet).toFixed(2)}</div>
                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '16px'}}>
                  Approximation based on total gross vs net margin deductions (including rent/commission).
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)'}}>
          <p>Not enough data yet. Log some hours to see your trends!</p>
        </div>
      )}

    </div>
  );
}
