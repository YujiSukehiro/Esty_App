import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Plus, Minus, FileText } from 'lucide-react';
import { addSessionProcessed } from '../../services/financialProcessor';
import ServiceGrid from './ServiceGrid';
import SessionLedger from './SessionLedger';

export default function DailyTallyView({ dateStr }) {
  const dailyLogs = useLiveQuery(() => db.dailyLogs.where('dateStr').equals(dateStr).toArray(), [dateStr]);
  const currentLog = dailyLogs?.[0]; // Will be undefined if it doesn't exist
  const sessions = useLiveQuery(() => db.sessions.where('dateStr').equals(dateStr).toArray(), [dateStr]);
  
  const todayTips = sessions?.reduce((sum, s) => sum + (s.tipAmount || 0), 0) || 0;

  const settings = useLiveQuery(() => db.settings.toArray());
  
  // Create a display date strictly using the string to avoid timezone shifts
  // Simple YYYY-MM-DD split
  const [yyyy, mm, dd] = dateStr.split('-');
  const displayDate = new Date(yyyy, mm - 1, dd).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleWorkedTodayToggle = async () => {
    if (currentLog) {
      await db.dailyLogs.delete(currentLog.dateStr);
    } else {
      let cost = 0;
      const model = settings?.find(s => s.key === 'financialModel')?.value;
      if (model === 'BoothRent') {
        const rent = settings?.find(s => s.key === 'monthlyRent')?.value || 0;
        const days = settings?.find(s => s.key === 'workingDaysPerMonth')?.value || 20;
        if (days > 0) cost = rent / days;
      }
      await db.dailyLogs.add({
        dateStr: dateStr,
        totalHours: 0,
        locationCost: cost,
        totalGrossRev: 0,
        netProfit: -cost // Booth Rent implies a starting loss
      });
    }
  };

  const updateHours = async (delta) => {
    if (!currentLog) return;
    const newHours = Math.max(0, currentLog.totalHours + delta);
    await db.dailyLogs.update(currentLog.dateStr, { totalHours: newHours });
  };
  const handleAddSession = async (service, options = {}) => {
    if (!currentLog) {
      alert("Please toggle 'Worked Today' before adding services.");
      return;
    }
    await addSessionProcessed(dateStr, service.id, options);
    if (options.durationHours) {
      await updateHours(options.durationHours);
    }
  };

  return (
    <div style={{padding: '16px'}}>
      <h1 style={{fontSize: '1.5rem', marginBottom: '8px'}}>Daily Tally</h1>
      <p style={{color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 600}}>{displayDate}</p>

      {/* Master Toggle */}
      <div className="card" onClick={handleWorkedTodayToggle} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', cursor: 'pointer', border: currentLog ? '1px solid var(--success-color)' : '1px solid var(--border-highlight)'}}>
        <div>
          <h3 style={{margin: 0, fontSize: '1.25rem', color: currentLog ? 'var(--success-color)' : 'var(--text-primary)'}}>Worked Today</h3>
          <p style={{margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>{currentLog ? 'Location costs applied.' : 'Enable to track services.'}</p>
        </div>
        <div className={`toggle-switch ${currentLog ? 'active' : ''}`}>
          <div className="toggle-thumb" />
        </div>
      </div>

      {currentLog && (
        <div className="card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px'}}>
          <h3 style={{margin: '0 0 24px 0', fontSize: '1rem', color: 'var(--text-secondary)'}}>Total Hours Logged</h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '32px'}}>
            <button className="btn btn-secondary" style={{width: '64px', height: '64px', borderRadius: '50%', padding: 0}} onClick={() => updateHours(-0.5)}>
              <Minus size={28} />
            </button>
            <div style={{fontSize: '3.5rem', fontWeight: '800', width: '90px', textAlign: 'center', color: 'var(--text-primary)', letterSpacing: '-1px'}}>
              {currentLog.totalHours.toFixed(1)}
            </div>
            <button className="btn btn-primary" style={{width: '64px', height: '64px', borderRadius: '50%', padding: 0, boxShadow: 'var(--shadow-md)'}} onClick={() => updateHours(0.5)}>
              <Plus size={28} />
            </button>
          </div>
        </div>
      )}

      {currentLog && (
        <div style={{marginTop: '32px'}}>
          <ServiceGrid dateStr={dateStr} onAddSession={handleAddSession} />
          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', marginTop: '32px'}}>
            <h2 style={{fontSize: '1.25rem', margin: 0}}>Session Ledger</h2>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Today's Metrics</div>
              <div style={{fontSize: '0.875rem', fontWeight: 600}}>
                Gross: <span style={{color: 'var(--primary-color)'}}>${currentLog.totalGrossRev.toFixed(2)}</span>
                <span style={{margin: '0 8px', color: 'var(--border-color)'}}>|</span>
                Tips: <span style={{color: 'var(--success-color)'}}>${todayTips.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <SessionLedger dateStr={dateStr} />
        </div>
      )}

      {!currentLog && (
        <div style={{marginTop: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
          <FileText size={48} style={{opacity: 0.3, margin: '0 auto 16px auto'}} />
          <p>Toggle "Worked Today" above to begin your shift.</p>
        </div>
      )}
    </div>
  );
}
