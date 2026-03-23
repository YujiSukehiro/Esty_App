import { db } from '../db';

export async function addSessionProcessed(dateStr, serviceId, options = {}) {
  return db.transaction('rw', db.sessions, db.serviceCatalog, db.materialCatalog, db.inventory, db.dailyLogs, db.settings, async () => {
    
    const service = await db.serviceCatalog.get(serviceId);
    if (!service) throw new Error("Service not found");

    // Deduct fractional inventory (Bill of Materials stacking)
    for (const lm of (service.linkedMaterials || [])) {
       const invs = await db.inventory.where('materialId').equals(lm.materialId).toArray();
       if (invs.length > 0) {
          const mainInv = invs[0];
          await db.inventory.update(mainInv.id, {
             currentQuantity: Math.max(0, mainInv.currentQuantity - lm.quantity)
          });
       }
    }

    const sessionId = await db.sessions.add({
      dateStr,
      serviceId,
      timestamp: Date.now(),
      isMember: false,
      isFree: false,
      hasAccident: false,
      tipAmount: 0,
      tipType: 'Card',
      customRevenue: options.customRevenue
    });

    await recalculateDailyLog(dateStr);
    return sessionId;
  });
}

export async function updateSessionProcessed(sessionId, updates) {
  return db.transaction('rw', db.sessions, db.dailyLogs, db.settings, db.serviceCatalog, db.inventory, async () => {
     const session = await db.sessions.get(sessionId);
     if (!session) return;
     
     // Handle accident modifier logic for extra 15% waste deduction
     const oldAccident = session.hasAccident;
     const newAccident = updates.hasAccident !== undefined ? updates.hasAccident : oldAccident;

     if (newAccident && !oldAccident) {
        // apply 15% penalty
        const service = await db.serviceCatalog.get(session.serviceId);
        if (service && service.linkedMaterials) {
            for (const lm of service.linkedMaterials) {
                const invs = await db.inventory.where('materialId').equals(lm.materialId).toArray();
                if (invs.length > 0) {
                    const penalty = lm.quantity * 0.15;
                    await db.inventory.update(invs[0].id, {
                        currentQuantity: Math.max(0, invs[0].currentQuantity - penalty)
                    });
                }
            }
        }
     } else if (!newAccident && oldAccident) {
        // revert 15% penalty
        const service = await db.serviceCatalog.get(session.serviceId);
        if (service && service.linkedMaterials) {
            for (const lm of service.linkedMaterials) {
                const invs = await db.inventory.where('materialId').equals(lm.materialId).toArray();
                if (invs.length > 0) {
                    const penalty = lm.quantity * 0.15;
                    await db.inventory.update(invs[0].id, {
                        currentQuantity: invs[0].currentQuantity + penalty
                    });
                }
            }
        }
     }

     await db.sessions.update(sessionId, updates);
     await recalculateDailyLog(session.dateStr);
  });
}

export async function deleteSessionProcessed(sessionId) {
  return db.transaction('rw', db.sessions, db.dailyLogs, db.settings, db.serviceCatalog, db.inventory, async () => {
     const session = await db.sessions.get(sessionId);
     if (!session) return;
     
     // Restore inventory 
     const service = await db.serviceCatalog.get(session.serviceId);
     if (service && service.linkedMaterials) {
        let multiplier = session.hasAccident ? 1.15 : 1.0;
        for (const lm of service.linkedMaterials) {
            const invs = await db.inventory.where('materialId').equals(lm.materialId).toArray();
            if (invs.length > 0) {
                const toRestore = lm.quantity * multiplier;
                await db.inventory.update(invs[0].id, {
                    currentQuantity: invs[0].currentQuantity + toRestore
                });
            }
        }
     }

     await db.sessions.delete(sessionId);
     await recalculateDailyLog(session.dateStr);
  });
}

export async function recalculateDailyLog(dateStr) {
   const logArr = await db.dailyLogs.where('dateStr').equals(dateStr).toArray();
   if (logArr.length === 0) return;
   const log = logArr[0];

   const sessions = await db.sessions.where('dateStr').equals(dateStr).toArray();
   const settings = await db.settings.toArray();
   
   const model = settings.find(s => s.key === 'financialModel')?.value || 'Commission';
   const commPct = settings.find(s => s.key === 'commissionPercentage')?.value || 50;

   let totalGross = 0;
   let materialCosts = 0; // Fixed flat tracking for now or updated later
   let totalTips = 0;

   for (const session of sessions) {
      const svc = await db.serviceCatalog.get(session.serviceId);
      if (!svc) continue;

      let revenue = session.customRevenue !== undefined ? session.customRevenue : (session.isMember && svc.memberPrice ? svc.memberPrice : svc.standardPrice);
      if (session.isFree) revenue = 0;

      totalGross += revenue;
      totalTips += session.tipAmount || 0;
      
      // Accumulate theoretical material cost 
      if (svc.linkedMaterials) {
         for (const lm of svc.linkedMaterials) {
            const mat = await db.materialCatalog.get(lm.materialId);
            const unitCost = mat?.unitCost || 0; 
            let sessionMatCost = lm.quantity * unitCost;
            if (session.hasAccident) sessionMatCost *= 1.15;
            materialCosts += sessionMatCost;
         }
      }
   }

   let netProfit = 0;
   if (model === 'BoothRent') {
      netProfit = totalGross - log.locationCost - materialCosts + totalTips;
   } else {
      netProfit = (totalGross * (commPct / 100)) - materialCosts + totalTips;
   }

   await db.dailyLogs.update(log.dateStr, {
      totalGrossRev: totalGross,
      netProfit: netProfit
   });
}
