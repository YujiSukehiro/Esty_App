import FinancialSetup from './FinancialSetup';
import InventoryManager from './InventoryManager';
import ServiceBuilder from './ServiceBuilder';
import BackupManager from './BackupManager';

export default function SettingsView() {
  return (
    <div>
      <h1 style={{fontSize: '1.5rem', marginBottom: '24px'}}>Settings Dashboard</h1>
      <BackupManager />
      <FinancialSetup />
      <InventoryManager />
      <ServiceBuilder />
    </div>
  );
}
