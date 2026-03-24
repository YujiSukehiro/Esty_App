import { X } from 'lucide-react';

export default function ReportDrilldownModal({ isOpen, onClose, metricType, stats, finModel, taxRate, rentOverhead }) {
  if (!isOpen || !stats) return null;

  // stats expected to contain: serviceStats, totalGross, totalNet, totalCOGS, afterTaxNet, businessShare, totalTips, cashTips, cardTips
  // serviceStats format: { [serviceName]: { count, revenue, cogs, estyCut, bizCut, tips } }

  const sortedServices = Object.entries(stats.serviceStats || {}).sort((a, b) => b[1].revenue - a[1].revenue);

  const renderContent = () => {
    switch(metricType) {
      case 'GROSS':
        return (
          <>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>Breakdown of services contributing to your total Gross Revenue of <strong>${stats.totalGross.toFixed(2)}</strong>.</p>
            <table className="drilldown-table">
              <thead><tr><th>Service</th><th style={{textAlign:'center'}}>Count</th><th style={{textAlign:'right'}}>Gross Revenue</th></tr></thead>
              <tbody>
                {sortedServices.map(([name, data]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{textAlign:'center'}}>{data.count}</td>
                    <td style={{textAlign:'right', fontWeight:600}}>${data.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{borderTop: '2px solid var(--border-color)', fontWeight: 800}}>
                  <td>Total</td><td style={{textAlign:'center'}}>{sortedServices.reduce((sum, [, d])=>sum+d.count, 0)}</td>
                  <td style={{textAlign:'right', color: 'var(--primary-color)'}}>${stats.totalGross.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </>
        );
      case 'NET':
        return (
          <>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>Breakdown of how your true post-tax take home of <strong>${stats.afterTaxNet.toFixed(2)}</strong> is calculated.</p>
            
            <h4 style={{marginTop: 0, marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Service Breakdown (Pre-Tax Take Home)</h4>
            <table className="drilldown-table" style={{marginBottom: '24px'}}>
              <thead><tr><th>Service</th><th style={{textAlign:'center'}}>Count</th><th style={{textAlign:'right'}}>Your Cut + Tips</th></tr></thead>
              <tbody>
                {sortedServices.map(([name, data]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{textAlign:'center'}}>{data.count}</td>
                    <td style={{textAlign:'right'}}>${(data.estyCut + data.tips).toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{borderTop: '1px solid var(--border-color)', fontWeight: 600}}>
                  <td colSpan="2">Gross Service Take-Home</td>
                  <td style={{textAlign:'right'}}>${Object.values(stats.serviceStats).reduce((sum, d)=>sum + d.estyCut + d.tips, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <h4 style={{marginTop: 0, marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Bottom Line Math</h4>
            <table className="drilldown-table">
              <tbody>
                <tr>
                  <td>Total Service Take-Home (inc. tips)</td>
                  <td style={{textAlign:'right'}}>${stats.totalNet.toFixed(2)}</td>
                </tr>
                {finModel === 'BoothRent' && rentOverhead > 0 && (
                  <tr style={{color: 'var(--danger-color)'}}>
                    <td>Less: Rent Overhead for Period</td>
                    <td style={{textAlign:'right'}}>-${rentOverhead.toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{color: 'var(--danger-color)'}}>
                  <td>Less: Estimated Taxes ({taxRate}%)</td>
                  <td style={{textAlign:'right'}}>-${(stats.totalNet - stats.afterTaxNet).toFixed(2)}</td>
                </tr>
                <tr style={{borderTop: '2px solid var(--border-color)', fontWeight: 800}}>
                  <td>True Post-Tax Net</td>
                  <td style={{textAlign:'right', color: 'var(--success-color)'}}>${stats.afterTaxNet.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </>
        );
      case 'TIPS':
        return (
          <>
             <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>Breakdown of tips collected across services.</p>
             <table className="drilldown-table" style={{marginBottom: '24px'}}>
              <thead><tr><th>Service</th><th style={{textAlign:'right'}}>Total Tips</th></tr></thead>
              <tbody>
                {sortedServices.filter(([, d]) => d.tips > 0).map(([name, data]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{textAlign:'right'}}>${data.tips.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display: 'flex', gap: '16px', justifyContent: 'flex-end', fontWeight: 600, fontSize: '1.1rem'}}>
               <div>Cash: <span style={{color: 'var(--success-color)'}}>${stats.cashTips.toFixed(2)}</span></div>
               <div>Card: <span style={{color: 'var(--primary-color)'}}>${stats.cardTips.toFixed(2)}</span></div>
               <div>Total: <span style={{color: 'var(--success-color)'}}>${stats.totalTips.toFixed(2)}</span></div>
            </div>
          </>
        );
      case 'BUSINESS_SHARE':
        return (
          <>
             <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>Breakdown of what the business retains after your commission and material costs.</p>
             <table className="drilldown-table">
              <thead><tr><th>Service</th><th style={{textAlign:'right'}}>Business Cut</th></tr></thead>
              <tbody>
                {sortedServices.filter(([, d]) => d.bizCut > 0).map(([name, data]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{textAlign:'right'}}>${data.bizCut.toFixed(2)}</td>
                  </tr>
                ))}
                <tr style={{borderTop: '2px solid var(--border-color)', fontWeight: 800}}>
                  <td>Total Business Share</td>
                  <td style={{textAlign:'right', color: 'var(--danger-color)'}}>${stats.businessShare.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            {finModel === 'BoothRent' && (
              <div style={{marginTop: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '12px', borderRadius: '8px'}}>
                Note: In Booth Rent model, the business share from services is typically $0, as you retain full gross revenue minus your own material costs.
              </div>
            )}
          </>
        );
      default:
        return <p>Unknown metric type.</p>;
    }
  };

  const getTitle = () => {
    switch(metricType) {
      case 'GROSS': return 'Gross Revenue Details';
      case 'NET': return 'True Net Profit Math';
      case 'TIPS': return 'Tips Breakdown';
      case 'BUSINESS_SHARE': return 'Business Share Details';
      default: return 'Details';
    }
  };

  return (
    <div className="modal-overlay">
      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; align-items: center; justifyContent: center;
          z-index: 1000; padding: 16px; backdrop-filter: blur(2px);
        }
        .modal-content {
          background: var(--card-bg); width: 100%; max-width: 500px;
          border-radius: 16px; padding: 24px; box-shadow: var(--shadow-xl);
          max-height: 90vh; overflow-y: auto; position: relative;
        }
        .drilldown-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .drilldown-table th { border-bottom: 2px solid var(--border-color); padding: 12px 0; text-align: left; color: var(--text-secondary); }
        .drilldown-table td { border-bottom: 1px solid var(--border-color); padding: 12px 0; }
        .close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text-secondary); cursor: pointer; }
      `}</style>
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        <h2 style={{marginTop: 0, fontSize: '1.25rem', marginBottom: '8px'}}>{getTitle()}</h2>
        {renderContent()}
      </div>
    </div>
  );
}
