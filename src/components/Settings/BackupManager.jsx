import { useState } from 'react';
import { db } from '../../db';
import { Download, UploadCloud } from 'lucide-react';

export default function BackupManager() {
  const [importing, setImporting] = useState(false);

  const exportData = async () => {
    try {
      const data = {};
      for (const table of db.tables) {
        data[table.name] = await table.toArray();
      }

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `EstyApp_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export data.');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('WARNING: Importing a backup will completely overwrite your current device data. Are you sure?')) {
      event.target.value = null;
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
          await table.clear();
        }
        for (const tableName of Object.keys(data)) {
          if (db[tableName]) {
            await db[tableName].bulkAdd(data[tableName]);
          }
        }
      });
      alert('Backup successfully restored! The app will now reload.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to parse or restore backup JSON. ' + err.message);
    } finally {
      setImporting(false);
      event.target.value = null;
    }
  };

  return (
    <div className="card" style={{ borderColor: 'var(--danger-color)' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: 'var(--danger-color)' }}>Data Failsafe & Backup</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        Since this app stores data physically on your device, you MUST periodically export backups to iCloud or a hard drive.
      </p>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger-color)' }} onClick={exportData}>
          <Download size={18} /> Export JSON
        </button>

        <label className="btn btn-secondary" style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', opacity: importing ? 0.5 : 1 }}>
          <UploadCloud size={18} /> {importing ? 'Importing...' : 'Restore JSON'}
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} disabled={importing} />
        </label>
      </div>
    </div>
  );
}
