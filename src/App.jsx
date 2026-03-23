import { useState } from 'react';
import SettingsView from './components/Settings/SettingsView';
import CalendarView from './components/Calendar/CalendarView';
import DailyTallyView from './components/Tally/DailyTallyView';
import ReportsView from './components/Reports/ReportsView';
import { Calendar, Settings, FileText, PieChart } from 'lucide-react';
import './App.css';

// Handle timezone safely
const getLocalISO = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalISO());

  const handleSelectDate = (dateStr) => {
    setSelectedDateStr(dateStr);
    setActiveTab('tally'); // Jump straight to tally when a date is selected from calendar
  };

  return (
    <>
      <main className="content-area">
        {activeTab === 'tally' && <DailyTallyView dateStr={selectedDateStr} />}
        {activeTab === 'calendar' && <CalendarView onSelectDate={handleSelectDate} />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'tally' ? 'active' : ''}`} onClick={() => setActiveTab('tally')}>
          <FileText size={24} />
          <span>Tally</span>
        </div>
        <div className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          <Calendar size={24} />
          <span>Calendar</span>
        </div>
        <div className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          <PieChart size={24} />
          <span>Reports</span>
        </div>
        <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={24} />
          <span>Settings</span>
        </div>
      </nav>
    </>
  )
}

export default App;
