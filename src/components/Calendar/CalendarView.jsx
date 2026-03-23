import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView({ onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));

  // Handle timezone safely by ensuring the padded local YYYY-MM-DD
  const formatLocalISO = (d) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const todayStr = formatLocalISO(new Date());

  return (
    <div style={{padding: '16px'}}>
      <h1 style={{fontSize: '1.5rem', marginBottom: '24px'}}>Operational Calendar</h1>
      <div className="card" style={{padding: '24px 16px', borderRadius: '16px'}}>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <button className="btn btn-secondary" style={{width: 'auto', padding: '8px 12px', border: 'none'}} onClick={prevMonth}>
            <ChevronLeft />
          </button>
          <h2 style={{margin: 0, fontSize: '1.125rem'}}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button className="btn btn-secondary" style={{width: 'auto', padding: '8px 12px', border: 'none'}} onClick={nextMonth}>
            <ChevronRight />
          </button>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px'}}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} style={{textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)'}}>
              {d}
            </div>
          ))}
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px'}}>
          {days.map((date, idx) => {
            if (!date) return <div key={idx} />; 
            
            const dateStr = formatLocalISO(date);
            const isToday = dateStr === todayStr;

            return (
              <div 
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`calendar-day ${isToday ? 'is-today' : ''}`}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
