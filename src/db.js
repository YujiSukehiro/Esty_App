import Dexie from 'dexie';

// Initialize the Database
export const db = new Dexie('EstheticianAppDB');

// Define database schemas
// Primary keys are denoted with '++id' (auto-incrementing) or 'key'
db.version(1).stores({
  settings: 'key, value', 
  serviceCatalog: '++id, serviceName', // Complex objects like linkedMaterials array are just stored, not indexed
  materialCatalog: '++id, materialName', 
  inventory: '++id, materialId, currentQuantity', // currentQuantity tracks fractional amounts (e.g., 0.85)
  dailyLogs: '++dateStr, totalHours, locationCost', // Primary key is date string "YYYY-MM-DD"
  sessions: '++id, dateStr, serviceId, timestamp' // Foreign key ties to dailyLogs.dateStr
});

// Robust error handling and lifecycle hooks
db.on('ready', function () {
  console.log('Dexie IndexedDB initialized and ready.');
});

db.on('populate', async () => {
  // Populate default foundational settings
  await db.settings.bulkAdd([
    { key: 'financialModel', value: 'Commission' }, // or 'BoothRent'
    { key: 'commissionPercentage', value: 50 },
    { key: 'monthlyRent', value: 0 },
    { key: 'workingDaysPerMonth', value: 20 },
    { key: 'currency', value: 'USD' }
  ]);
  console.log('Database populated with initial application settings.');
});

db.open().catch(err => {
  console.error('Failed to open IndexedDB. Ensure you are not in Private Browsing mode with strict storage limits.', err.stack || err);
});
