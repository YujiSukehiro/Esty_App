import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Plus, Trash2 } from 'lucide-react';

export default function ServiceBuilder() {
  const services = useLiveQuery(() => db.serviceCatalog.toArray());
  const materials = useLiveQuery(() => db.materialCatalog.toArray());
  
  const [isAdding, setIsAdding] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newStandardPrice, setNewStandardPrice] = useState('');
  const [newMemberPrice, setNewMemberPrice] = useState('');
  const [linkedMats, setLinkedMats] = useState([]);

  const saveService = async () => {
    if (!newServiceName || !newStandardPrice) return;
    await db.serviceCatalog.add({
      serviceName: newServiceName,
      standardPrice: Number(newStandardPrice),
      memberPrice: newMemberPrice ? Number(newMemberPrice) : null,
      linkedMaterials: linkedMats
    });
    setIsAdding(false);
    setNewServiceName('');
    setNewStandardPrice('');
    setNewMemberPrice('');
    setLinkedMats([]);
  };

  const deleteService = async (id) => {
    await db.serviceCatalog.delete(id);
  };

  return (
    <div className="card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
        <h2 style={{margin: 0, fontSize: '1.25rem'}}>Services (B.O.M)</h2>
        {!isAdding && (
          <button className="btn btn-primary" style={{width: 'auto', padding: '8px 12px', fontSize: '0.875rem'}} onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Add Service
          </button>
        )}
      </div>
      <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Configure services, pricing tiers, and Bill of Materials stacking.</p>

      {isAdding && (
        <div style={{background: 'var(--bg-color)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-color)'}}>
          <div className="input-group">
            <label>Service Name</label>
            <input className="input-field" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g. Hybrid Full Set" />
          </div>
          <div style={{display: 'flex', gap: '12px'}}>
            <div className="input-group" style={{flex: 1}}>
              <label>Standard Price ($)</label>
              <input type="number" className="input-field" value={newStandardPrice} onChange={e => setNewStandardPrice(e.target.value)} />
            </div>
            <div className="input-group" style={{flex: 1}}>
              <label>Member Price ($)</label>
              <input type="number" className="input-field" value={newMemberPrice} onChange={e => setNewMemberPrice(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          
          <div className="input-group">
            <label>Linked Materials (Cost of Goods)</label>
            <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
              <select id="matSelect" className="input-field" style={{flex: 2}}>
                <option value="">Select Material...</option>
                {materials?.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)}
              </select>
              <input id="matQty" type="number" step="0.001" placeholder="Qty" className="input-field" style={{flex: 1}} />
              <button className="btn btn-secondary" style={{width: 'auto', padding: '8px'}} onClick={() => {
                const matId = document.getElementById('matSelect').value;
                const qty = document.getElementById('matQty').value;
                if(matId && qty) setLinkedMats([...linkedMats, { materialId: Number(matId), quantity: Number(qty) }]);
              }}><Plus size={16} /></button>
            </div>
            {linkedMats.map((lm, idx) => {
              const mName = materials?.find(m => m.id === lm.materialId)?.materialName || 'Unknown';
              return (
                <div key={idx} style={{fontSize: '0.875rem', padding: '4px 0', borderBottom: '1px solid var(--border-color)'}}>
                  {lm.quantity}x {mName}
                </div>
              );
            })}
          </div>

          <div style={{display: 'flex', gap: '8px'}}>
            <button className="btn btn-primary" onClick={saveService}>Save</button>
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {services?.map(svc => (
          <div key={svc.id} style={{padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <strong style={{fontSize: '1rem'}}>{svc.serviceName}</strong>
                <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                  Standard: ${svc.standardPrice} {svc.memberPrice && `| Member: $${svc.memberPrice}`}
                </div>
              </div>
              <button className="btn btn-danger" style={{width: 'auto', padding: '8px'}} onClick={() => deleteService(svc.id)}>
                <Trash2 size={16} />
              </button>
            </div>
            {svc.linkedMaterials?.length > 0 && (
              <div style={{marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '8px', borderRadius: '4px'}}>
                <strong>B.O.M Stack:</strong>
                {svc.linkedMaterials.map((lm, idx) => {
                  const mName = materials?.find(m => m.id === lm.materialId)?.materialName || 'Unknown';
                  return <div key={idx}>- {lm.quantity} {mName}</div>
                })}
              </div>
            )}
          </div>
        ))}
        {services?.length === 0 && !isAdding && <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center'}}>No services configured.</p>}
      </div>
    </div>
  );
}
