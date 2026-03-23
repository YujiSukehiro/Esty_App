import { useState, useMemo } from 'react';
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
  const [activeTab, setActiveTab] = useState('Current Month'); // Current Month, Month-over-Month, Previous Months, YTD, Previous Years
  const [selectedPrevMonth, setSelectedPrevMonth] = useState('');
  
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const serviceCatalog = useLiveQuery(() => db.serviceCatalog.toArray());
  const materialCatalog = useLiveQuery(() => db.materialCatalog.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());

  const {
    totalGross,
    totalNet,
    afterTaxNet,
    effectiveTaxRate,
    expectedCheckGross,
    expectedCheckNet,
    payFrequency,
    totalCOGS,
    rentOverhead,
    businessShare,
    totalTips,
    cashTips,
    cardTips,
    totalSessions,
    serviceDistribution,
    lineChartTemplate,
    barChartTemplate,
    previousMoM,
    availableMonths,
    effectivePrevMonth
  } = useMemo(() => {
    if (!dailyLogs || !sessions || !settings) return {
      totalGross: 0, totalNet: 0, afterTaxNet: 0, effectiveTaxRate: 25, expectedCheckGross: 0, expectedCheckNet: 0, payFrequency: 'Bi-Weekly',
      businessShare: 0, totalTips: 0, cashTips: 0, cardTips: 0, totalSessions: 0,
      serviceDistribution: {}, lineChartTemplate: null, barChartTemplate: null, previousMoM: null,
      availableMonths: [], effectivePrevMonth: ''
    };

    const finModel = settings.find(s => s.key === 'financialModel')?.value || 'Commission';
    const commPct = settings.find(s => s.key === 'commissionPercentage')?.value || 50;
    const payFreq = settings.find(s => s.key === 'payFrequency')?.value || 'Bi-Weekly';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Discover available months from all sessions
    const monthsSet = new Set();
    sessions?.forEach(s => {
      const d = new Date(s.dateStr);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    const availableMonths = Array.from(monthsSet).sort().reverse();
    
    // Auto-select most recent previous month if none selected
    let effectivePrevMonth = selectedPrevMonth;
    if (activeTab === 'Previous Months' && !effectivePrevMonth && availableMonths.length > 0) {
      // Exclude current month if possible
      const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const pastOnly = availableMonths.filter(m => m !== currentMonthStr);
      effectivePrevMonth = pastOnly[0] || availableMonths[0];
    }

    // Helper to check boundaries
    const filterData = (dateStr) => {
      const d = new Date(dateStr);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (activeTab === 'Current Month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      } else if (activeTab === 'Previous Months') {
        return mStr === effectivePrevMonth;
      } else if (activeTab === 'YTD') {
        return d.getFullYear() === currentYear;
      } else if (activeTab === 'Previous Years') {
        return d.getFullYear() < currentYear;
      } else if (activeTab === 'Month-over-Month') { // Show current month vs last month
        return (d.getFullYear() === currentYear && d.getMonth() === currentMonth) || 
               (d.getFullYear() === currentYear && d.getMonth() === currentMonth - 1) ||
               (d.getFullYear() === currentYear - 1 && currentMonth === 0 && d.getMonth() === 11);
      }
      return true;
    };

    const relevantSessions = sessions.filter(s => filterData(s.dateStr));
    const relevantLogs = dailyLogs.filter(l => filterData(l.dateStr));

    // Calculate exact splits aggregating by session
    let gross = 0;
    let net = 0; // Esthetician take home
    let bizShare = 0;
    let tips = 0;
    let cashT = 0;
    let cardT = 0; // Fix: Re-add cardT that was overwritten
    let cogs = 0;

    // For MoM specifically, we need to bucket into current vs previous
    let currentMoMGross = 0;
    let prevMoMGross = 0;

    const distribution = {};

    relevantSessions.forEach(s => {
      const svc = serviceCatalog?.find(cat => cat.id === s.serviceId);
      const sName = svc ? svc.serviceName : 'Custom Service';
      distribution[sName] = (distribution[sName] || 0) + 1;

      const rev = s.customRevenue || 0;
      const tip = s.tipAmount || 0;
      gross += rev;
      tips += tip;
      
      if (s.tipType === 'Cash') {
        cashT += tip;
      } else {
        cardT += tip;
      }

      let estyCut = 0;
      let bizCut = 0;
      let sessionCOGS = 0;

      // Extract Material COGS if linked
      if (svc && svc.linkedMaterials && materialCatalog) {
        svc.linkedMaterials.forEach(lm => {
          const mat = materialCatalog.find(m => m.id === lm.materialId);
          if (mat && mat.unitCost) {
            sessionCOGS += (mat.unitCost * lm.quantity);
          }
        });
      }

      if (finModel === 'BoothRent') {
        estyCut = rev - sessionCOGS; // Take home revenue minus COGS. Rent handled periodically.
        bizCut = 0;
      } else {
        estyCut = rev * (commPct / 100);
        bizCut = rev - estyCut - sessionCOGS; // Business eats the material cost
      }

      // Group for MoM logic, only add to main KPIs if it's the current month
      const sDate = new Date(s.dateStr);
      if (activeTab === 'Month-over-Month') {
        if (sDate.getMonth() === currentMonth) {
          currentMoMGross += rev;
          net += (estyCut + tip);
          bizShare += bizCut;
          gross += rev;
          tips += tip;
          cogs += sessionCOGS;
          if (s.tipType === 'Cash') cashT += tip; else cardT += tip;
        } else {
          prevMoMGross += rev;
        }
      } else {
        net += (estyCut + tip);
        bizShare += bizCut;
        gross += rev;
        tips += tip;
        cogs += sessionCOGS;
        if (s.tipType === 'Cash') cashT += tip; else cardT += tip;
      }
    });

    // Chart logic
    let lineLabels = [];
    let netData = [];
    let bizData = [];
    
    // Sort logs ascending
    relevantLogs.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

    if (activeTab === 'Current Month' || activeTab === 'Previous Months' || activeTab === 'Month-over-Month') {
      // Group by Day
      const dailyMap = {};
      relevantLogs.forEach(l => {
        const d = new Date(l.dateStr);
        if (activeTab === 'Month-over-Month' && d.getMonth() !== currentMonth) return; // Only line chart for current month
        const day = d.getDate();
        dailyMap[day] = dailyMap[day] || { n: 0, g: 0 };
        dailyMap[day].g += l.totalGrossRev;
        dailyMap[day].n += l.netProfit;
      });

      for (let i = 1; i <= 31; i++) {
        if (dailyMap[i]) {
          lineLabels.push(`Day ${i}`);
          netData.push(dailyMap[i].n);
          // Approximate biz share on line chart
          bizData.push(dailyMap[i].g - dailyMap[i].n); 
        }
      }
    } else {
      // Group by Month
      const monthlyMap = {};
      relevantLogs.forEach(l => {
        const d = new Date(l.dateStr);
        const mKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
        monthlyMap[mKey] = monthlyMap[mKey] || { n: 0, g: 0 };
        monthlyMap[mKey].g += l.totalGrossRev;
        monthlyMap[mKey].n += l.netProfit;
      });

      Object.keys(monthlyMap).sort().forEach(k => {
        lineLabels.push(k);
        netData.push(monthlyMap[k].n);
        bizData.push(monthlyMap[k].g - monthlyMap[k].n);
      });
    }

    const lineTemplate = {
      labels: lineLabels,
      datasets: [
        {
          label: 'Your Net Earnings ($)',
          data: netData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.3, fill: true, pointRadius: 3
        },
        {
          label: 'Business Share ($)',
          data: bizData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          tension: 0.3, fill: true, pointRadius: 3
        }
      ]
    };

    const barTemplate = {
      labels: ['Take-Home vs Business'],
      datasets: [
        { label: 'Your Net', data: [net], backgroundColor: '#10b981' },
        { label: 'Business Share', data: [bizShare], backgroundColor: '#f59e0b' }
      ]
    };

    // 1. Establish the timeframe duration (monthsInPeriod)
    let monthsInPeriod = 1;
    if (activeTab === 'YTD') {
      monthsInPeriod = Math.max(1, currentMonth + (now.getDate() / 30));
    } else if (activeTab === 'Previous Years') {
      const uniqueMonths = new Set(relevantSessions.map(s => s.dateStr.substring(0, 7)));
      monthsInPeriod = Math.max(1, uniqueMonths.size);
    }

    // 2. Subtract Overhead using monthsInPeriod
    const mRent = settings.find(s => s.key === 'monthlyRent')?.value || 0;
    let computedRentOverhead = 0;
    if (finModel === 'BoothRent' && net > 0) { // Only charge overhead if actively working
      computedRentOverhead = mRent * monthsInPeriod;
      net -= computedRentOverhead; // Rent is subtracted from Net since Booth Renter eats overhead
    }
    
    // 3. Tax is calculated AFTER COGS and Overhead are legally deducted from profits!
    const taxPct = settings.find(s => s.key === 'estimatedTaxRate')?.value;
    const effectiveTaxRate = taxPct !== undefined ? taxPct : 25; // default 25% if not set
    const taxAmount = Math.max(0, net * (effectiveTaxRate / 100)); // Only tax on positive net
    const afterTaxNet = net - taxAmount;

    // 4. Calculate Paycheck Size using monthsInPeriod and afterTaxNet
    let periodsPerMonth = 2.16; // default Bi-Weekly
    if (payFreq === 'Weekly') periodsPerMonth = 4.33;
    if (payFreq === 'Semi-Monthly') periodsPerMonth = 2.0;
    if (payFreq === 'Monthly') periodsPerMonth = 1.0;
    
    const totalPayPeriods = Math.max(1, monthsInPeriod * periodsPerMonth);
    const expectedCheckGross = net / totalPayPeriods;
    const expectedCheckNet = afterTaxNet / totalPayPeriods;

    let previousData = null;
    if (activeTab === 'Month-over-Month') {
      previousData = {
        current: currentMoMGross,
        previous: prevMoMGross,
        growth: prevMoMGross > 0 ? ((currentMoMGross - prevMoMGross) / prevMoMGross * 100) : 100
      };
    }

    return {
      totalGross: gross,
      totalNet: net,
      afterTaxNet: afterTaxNet,
      effectiveTaxRate: effectiveTaxRate,
      expectedCheckGross: expectedCheckGross,
      expectedCheckNet: expectedCheckNet,
      payFrequency: payFreq,
      totalCOGS: cogs,
      rentOverhead: computedRentOverhead,
      businessShare: bizShare,
      totalTips: tips,
      cashTips: cashT,
      cardTips: cardT,
      totalSessions: relevantSessions.length,
      serviceDistribution: distribution,
      lineChartTemplate: lineTemplate,
      barChartTemplate: barTemplate,
      previousMoM: previousData,
      availableMonths: availableMonths,
      effectivePrevMonth: effectivePrevMonth
    };

  }, [dailyLogs, sessions, serviceCatalog, materialCatalog, settings, activeTab, selectedPrevMonth]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { grid: { display: false } },
      y: { border: { display: false } }
    }
  };

  const pieDataTemplate = {
    labels: Object.keys(serviceDistribution || {}),
    datasets: [{
      data: Object.values(serviceDistribution || {}),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'
      ],
      borderWidth: 1
    }]
  };

  const tabs = ['Current Month', 'Month-over-Month', 'Previous Months', 'YTD', 'Previous Years'];

  return (
    <div style={{padding: '16px'}}>
      <h1 style={{fontSize: '1.5rem', marginBottom: '16px'}}>Deep Analytics</h1>
      
      {/* Tab Navigation */}
      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '16px', marginBottom: '8px'}}>
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', 
              borderRadius: '20px', 
              border: 'none', 
              background: activeTab === tab ? 'var(--primary-color)' : 'var(--bg-color)',
              color: activeTab === tab ? 'white' : 'var(--text-color)',
              fontWeight: 600,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: activeTab === tab ? 'none' : '1px solid var(--border-color)'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Previous Months' && (
        <div style={{marginBottom: '16px'}}>
          <select 
            className="input-field" 
            style={{padding: '8px 12px', minWidth: '200px', fontWeight: 600}}
            value={effectivePrevMonth || ''}
            onChange={(e) => setSelectedPrevMonth(e.target.value)}
          >
            {availableMonths.map(m => {
              const [y, mm] = m.split('-');
              const d = new Date(y, mm - 1, 1);
              return <option key={m} value={m}>{d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>;
            })}
          </select>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'}}>
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Gross Revenue</div>
          <div style={{fontSize: '1.5rem', fontWeight: 700}}>${totalGross.toFixed(2)}</div>
        </div>
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Tips</div>
          <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-color)'}}>${totalTips.toFixed(2)}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            Cash: ${cashTips.toFixed(2)} <span style={{margin:'0 4px', color:'var(--border-color)'}}>|</span> Card: ${cardTips.toFixed(2)}
          </div>
        </div>
        
        <div className="card" style={{padding: '16px'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>True Post-Tax Net</div>
          <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-color)'}}>${afterTaxNet.toFixed(2)}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            Taxes deducted at {effectiveTaxRate}% (${(totalNet - afterTaxNet).toFixed(2)})
          </div>
          {(rentOverhead > 0 || totalCOGS > 0) && (
            <div style={{fontSize: '0.75rem', color: 'var(--danger-color)', marginTop: '4px'}}>
              {rentOverhead > 0 && <span>-${rentOverhead.toFixed(2)} rent</span>}
              {rentOverhead > 0 && totalCOGS > 0 && <span> | </span>}
              {totalCOGS > 0 && <span>-${totalCOGS.toFixed(2)} supplies</span>}
            </div>
          )}
        </div>
        <div className="card" style={{padding: '16px', borderLeft: '4px solid var(--danger-color)'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Business Share</div>
          <div style={{fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger-color)'}}>${businessShare.toFixed(2)}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>What she's making the company</div>
        </div>

        <div className="card" style={{padding: '16px', gridColumn: '1 / -1', background: 'var(--card-bg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Est. Expected Paycheck</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Based on <strong style={{color:'var(--text-color)'}}>{payFrequency}</strong> payouts for {activeTab}</div>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-color)'}}>${expectedCheckNet.toFixed(2)} <span style={{fontSize:'0.875rem', fontWeight:400, color:'var(--text-secondary)'}}>net</span></div>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>${expectedCheckGross.toFixed(2)} gross</div>
          </div>
        </div>
      </div>

      {activeTab === 'Month-over-Month' && previousMoM && (
        <div className="card" style={{padding: '16px', marginBottom: '24px', background: 'var(--card-bg)', border: '1px solid var(--primary-color)'}}>
          <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '8px', color: 'var(--primary-color)'}}>Growth Analysis</h3>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Last Month Gross</div>
              <div style={{fontSize: '1.25rem', fontWeight: 600}}>${previousMoM.previous.toFixed(2)}</div>
            </div>
            <div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Current Month Gross</div>
              <div style={{fontSize: '1.25rem', fontWeight: 600}}>${previousMoM.current.toFixed(2)}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>MoM Change</div>
              <div style={{fontSize: '1.25rem', fontWeight: 700, color: previousMoM.growth >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}}>
                {previousMoM.growth > 0 ? '+' : ''}{previousMoM.growth.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Breakdown Area */}
      {totalSessions > 0 ? (
        <>
          <div className="card" style={{padding: '16px', marginBottom: '24px'}}>
            <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px'}}>Revenue & Take-Home Split over Time</h3>
            <div style={{height: '240px'}}>
              <Line options={chartOptions} data={lineChartTemplate} />
            </div>
          </div>
          
          <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '32px'}}>
            <div className="card" style={{padding: '16px'}}>
              <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px'}}>Take-Home vs Business Share</h3>
              <div style={{height: '250px'}}>
                <Bar options={chartOptions} data={barChartTemplate} />
              </div>
            </div>
            <div className="card" style={{padding: '16px'}}>
              <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px'}}>Service Popularity</h3>
              <div style={{height: '250px'}}>
                <Pie options={{responsive:true, maintainAspectRatio:false, plugins: {legend: {position: 'bottom'}}}} data={pieDataTemplate} />
              </div>
            </div>
          </div>

          <div className="card" style={{padding: '16px', marginBottom: '32px'}}>
            <h3 style={{fontSize: '1rem', marginTop: 0, marginBottom: '16px'}}>Exact Service Counts for this Period</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem'}}>
              <tbody>
                {Object.entries(serviceDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count], i) => (
                  <tr key={i} style={{borderBottom: '1px solid var(--border-color)'}}>
                    <td style={{padding: '12px 0', fontWeight: 500}}>{name}</td>
                    <td style={{padding: '12px 0', textAlign: 'right', color: 'var(--text-secondary)'}}>{count} services</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)'}}>
          <p>No valid data for this period.</p>
        </div>
      )}

    </div>
  );
}
