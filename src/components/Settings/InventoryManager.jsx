import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Plus, Trash2 } from 'lucide-react';

export default function InventoryManager() {
  const materials = useLiveQuery(() => db.materialCatalog.toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1.0');
  const [newUnitCost, setNewUnitCost] = useState('0.00');

  const addItem = async () => {
    if (!newItemName) return;
    const matId = await db.materialCatalog.add({ materialName: newItemName, unitCost: Number(newUnitCost) });
    await db.inventory.add({ materialId: matId, currentQuantity: Number(newQuantity) });
    setNewItemName('');
    setNewQuantity('1.0');
    setNewUnitCost('0.00');
  };

  const deleteItem = async (matId) => {
    await db.materialCatalog.delete(matId);
    const invRecord = inventory?.find(inv => inv.materialId === matId);
    if (invRecord) await db.inventory.delete(invRecord.id);
  };

  const updateQuantity = async (invId, newQty) => {
    await db.inventory.update(invId, { currentQuantity: Number(newQty) });
  };

  return (
    <div className="card">
      <h2 style={{marginTop: 0, fontSize: '1.25rem'}}>Inventory Manager</h2>
      <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Track supplies to the 4th decimal for high-precision usage.</p>
      
      <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
        <input 
          type="text" 
          placeholder="New Item (e.g. 0.03 D-Curl Tray)" 
          className="input-field"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
        />
        <input 
          type="number" 
          step="0.01"
          placeholder="Cost $" 
          className="input-field"
          style={{width: '90px'}}
          value={newUnitCost}
          onChange={e => setNewUnitCost(e.target.value)}
        />
        <input 
          type="number" 
          step="0.1"
          placeholder="Qty" 
          className="input-field"
          style={{width: '80px'}}
          value={newQuantity}
          onChange={e => setNewQuantity(e.target.value)}
        />
        <button className="btn btn-primary" style={{width: 'auto', padding: '12px'}} onClick={addItem}>
          <Plus size={20} />
        </button>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {materials?.map(mat => {
          const invItem = inventory?.find(i => i.materialId === mat.id);
          const qty = invItem ? invItem.currentQuantity : 0;
          const isLow = qty < 0.20;

          return (
            <div key={mat.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: isLow ? '#fee2e2' : 'var(--bg-color)', borderRadius: '8px', border: isLow ? '1px solid #ef4444' : '1px solid var(--border-color)'}}>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500}}>{mat.materialName} <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>(${mat.unitCost || 0}/unit)</span></div>
                {isLow && <div style={{fontSize: '0.75rem', color: 'var(--danger-color)', fontWeight: 'bold'}}>Low Stock Warning</div>}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <input 
                  type="number" 
                  step="0.0001" 
                  className="input-field" 
                  style={{width: '80px', padding: '8px', textAlign: 'right'}} 
                  value={qty} 
                  onChange={e => updateQuantity(invItem.id, e.target.value)}
                />
                <button className="btn btn-danger" style={{width: 'auto', padding: '8px'}} onClick={() => deleteItem(mat.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {materials?.length === 0 && <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center'}}>No items in inventory.</p>}
      </div>
    </div>
  );
}
