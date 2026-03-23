import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { updateSessionProcessed, deleteSessionProcessed } from '../../services/financialProcessor';
import { Trash2, DollarSign, AlertTriangle, Star, Gift } from 'lucide-react';

export default function SessionLedger({ dateStr }) {
  const sessions = useLiveQuery(() => db.sessions.where('dateStr').equals(dateStr).reverse().sortBy('timestamp'), [dateStr]);
  const services = useLiveQuery(() => db.serviceCatalog.toArray());

  const [expandedId, setExpandedId] = useState(null);

  const toggleModifier = async (session, field) => {
    await updateSessionProcessed(session.id, { [field]: !session[field] });
  };

  const setTip = async (session, amount, type) => {
    await updateSessionProcessed(session.id, { tipAmount: Number(amount), tipType: type });
  };

  const deleteSession = async (id) => {
    await deleteSessionProcessed(id);
  };

  if (!sessions || sessions.length === 0) {
    return <p style={{textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '24px'}}>No services logged today.</p>;
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
      {sessions.map(session => {
        const svc = services?.find(s => s.id === session.serviceId);
        if (!svc) return null;

        const isExpanded = expandedId === session.id;
        
        // Calculate Revenue for display
        let revenue = session.isMember && svc.memberPrice ? svc.memberPrice : svc.standardPrice;
        if (session.isFree) revenue = 0;

        return (
          <div key={session.id} className="card" style={{padding: '0', overflow: 'hidden', margin: 0}}>
            {/* Header / Summary */}
            <div 
              style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', cursor: 'pointer', background: isExpanded ? 'var(--bg-color)' : 'transparent'}}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              <div>
                <strong style={{fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  {svc.serviceName}
                  {session.isFree && <span style={{fontSize: '0.65rem', background: '#fee2e2', color: 'var(--danger-color)', padding: '2px 6px', borderRadius: '8px'}}>FREE</span>}
                  {session.isMember && <span style={{fontSize: '0.65rem', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '8px'}}>MEMBER</span>}
                  {session.hasAccident && <span style={{fontSize: '0.65rem', background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '8px'}}>WASTE %</span>}
                </strong>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                  ${revenue.toFixed(2)} 
                  {session.tipAmount > 0 && <span style={{color: 'var(--success-color)', fontWeight: 600}}> +${session.tipAmount} Tip ({session.tipType})</span>}
                </div>
              </div>
              <div style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>
                {new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && (
              <div style={{padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--surface-color)'}}>
                
                {/* Modifiers */}
                <div style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
                  <button 
                    className={`btn ${session.isMember ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{flex: 1, padding: '8px', fontSize: '0.75rem'}}
                    onClick={() => toggleModifier(session, 'isMember')}
                    disabled={!svc.memberPrice}
                  >
                    <Star size={14} /> Member Rate
                  </button>
                  <button 
                    className={`btn ${session.isFree ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{flex: 1, padding: '8px', fontSize: '0.75rem'}}
                    onClick={() => toggleModifier(session, 'isFree')}
                  >
                    <Gift size={14} /> Mark Free
                  </button>
                  <button 
                    className={`btn ${session.hasAccident ? 'btn-primary' : 'btn-secondary'}`} 
                    style={{flex: 1, padding: '8px', fontSize: '0.75rem'}}
                    onClick={() => toggleModifier(session, 'hasAccident')}
                  >
                    <AlertTriangle size={14} /> Material Waste
                  </button>
                </div>

                {/* Gratuity */}
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <DollarSign size={20} color="var(--text-secondary)" />
                  <input 
                    type="number" 
                    placeholder="Tip Amount" 
                    className="input-field" 
                    style={{padding: '8px', width: '100px'}}
                    value={session.tipAmount || ''}
                    onChange={e => setTip(session, e.target.value, session.tipType || 'Card')}
                  />
                  <select 
                    className="input-field" 
                    style={{padding: '8px', flex: 1}}
                    value={session.tipType || 'Card'}
                    onChange={e => setTip(session, session.tipAmount || 0, e.target.value)}
                  >
                    <option value="Card">Card/App</option>
                    <option value="Cash">Cash</option>
                  </select>
                  <button className="btn btn-danger" style={{width: 'auto', padding: '8px'}} onClick={() => deleteSession(session.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
