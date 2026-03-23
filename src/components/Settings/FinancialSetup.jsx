import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export default function FinancialSetup() {
  const settings = useLiveQuery(() => db.settings.toArray());
  const [model, setModel] = useState('Commission');
  const [commissionPct, setCommissionPct] = useState(50);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [workingDays, setWorkingDays] = useState(20);

  useEffect(() => {
    if (settings) {
      const mode = settings.find(s => s.key === 'financialModel')?.value;
      if (mode) setModel(mode);
      const cp = settings.find(s => s.key === 'commissionPercentage')?.value;
      if (cp !== undefined) setCommissionPct(cp);
      const mr = settings.find(s => s.key === 'monthlyRent')?.value;
      if (mr !== undefined) setMonthlyRent(mr);
      const wd = settings.find(s => s.key === 'workingDaysPerMonth')?.value;
      if (wd) setWorkingDays(wd);
    }
  }, [settings]);

  const saveSettings = async () => {
    await db.settings.bulkPut([
      { key: 'financialModel', value: model },
      { key: 'commissionPercentage', value: Number(commissionPct) },
      { key: 'monthlyRent', value: Number(monthlyRent) },
      { key: 'workingDaysPerMonth', value: Number(workingDays) }
    ]);
    alert('Financial Settings Saved Successfully!');
  };

  const dailyAmortizedRent = workingDays > 0 ? (monthlyRent / workingDays).toFixed(2) : 0;

  return (
    <div className="card">
      <h2 style={{marginTop: 0, fontSize: '1.25rem'}}>Financial Compensation</h2>
      <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Select your business structure to calculate true net profit.</p>
      
      <div className="segmented-control">
        <div className={`segment-btn ${model === 'Commission' ? 'active' : ''}`} onClick={() => setModel('Commission')}>
          Commission
        </div>
        <div className={`segment-btn ${model === 'BoothRent' ? 'active' : ''}`} onClick={() => setModel('BoothRent')}>
          Booth Rent
        </div>
      </div>

      {model === 'Commission' && (
        <div className="input-group">
          <label>Commission Split (Your % Take-Home)</label>
          <input 
            type="number" 
            className="input-field" 
            value={commissionPct} 
            onChange={e => setCommissionPct(e.target.value)} 
          />
        </div>
      )}

      {model === 'BoothRent' && (
        <>
          <div className="input-group">
            <label>Monthly Suite Rent ($)</label>
            <input 
              type="number" 
              className="input-field" 
              value={monthlyRent} 
              onChange={e => setMonthlyRent(e.target.value)} 
            />
          </div>
          <div className="input-group">
            <label>Avg. Working Days per Month</label>
            <input 
              type="number" 
              className="input-field" 
              value={workingDays} 
              onChange={e => setWorkingDays(e.target.value)} 
            />
          </div>
          <div style={{background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem'}}>
            <strong>Daily Amortized Location Rent:</strong> ${dailyAmortizedRent}/day
          </div>
        </>
      )}

      <button className="btn btn-primary" onClick={saveSettings}>Save Global Settings</button>
    </div>
  );
}
