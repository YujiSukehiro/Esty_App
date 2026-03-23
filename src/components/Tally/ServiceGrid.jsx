import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export default function ServiceGrid({ dateStr, onAddSession }) {
  const services = useLiveQuery(() => db.serviceCatalog.toArray());
  const [expressModalSvc, setExpressModalSvc] = useState(null);

  const handleServiceClick = (svc) => {
    if (svc.serviceName.toLowerCase().includes('express')) {
      setExpressModalSvc(svc);
    } else {
      onAddSession(svc);
    }
  };

  const confirmExpress = (minutes, price) => {
    onAddSession(expressModalSvc, { 
      durationHours: minutes / 60,
      customRevenue: price
    });
    setExpressModalSvc(null);
  };

  return (
    <div style={{marginBottom: '24px'}}>
      <h3 style={{fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px'}}>Quick-Add Service</h3>
      
      {expressModalSvc ? (
        <div className="card" style={{borderColor: 'var(--primary-color)', padding: '16px'}}>
          <h4 style={{marginTop: 0, marginBottom: '12px'}}>Select Duration: {expressModalSvc.serviceName}</h4>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <button className="btn btn-secondary" onClick={() => confirmExpress(45, 45)}>45m ($45)</button>
            <button className="btn btn-secondary" onClick={() => confirmExpress(55, 55)}>55m ($55)</button>
            <button className="btn btn-secondary" onClick={() => confirmExpress(65, 65)}>65m ($65)</button>
            <button className="btn btn-danger" style={{marginLeft: 'auto'}} onClick={() => setExpressModalSvc(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
          {services?.map(svc => (
            <button 
              key={svc.id} 
              className="btn btn-secondary" 
              style={{width: 'auto', padding: '8px 16px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 500}}
              onClick={() => handleServiceClick(svc)}
            >
              {svc.serviceName}
            </button>
          ))}
          {services?.length === 0 && <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>No services defined in Settings.</p>}
        </div>
      )}
    </div>
  );
}
