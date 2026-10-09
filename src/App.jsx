import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme, ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import HallSetup from './pages/HallSetup';
import AvailabilityTest from './pages/AvailabilityTest';
import Reservations from './pages/Reservations';
import BanquetReservationForm from './pages/BanquetReservationForm';
import BanquetCalendar from './pages/BanquetCalendar';
import BanquetFolio from './pages/BanquetFolio';
import MenuBuilder from './pages/MenuBuilder';
import TravelAgentManagement from './pages/TravelAgentManagement';
import BanquetReports from './pages/BanquetReports';
import AccountMapping from './pages/AccountMapping';
import GLLedger from './pages/GLLedger';
import CurrencyConfig from './pages/CurrencyConfig';

function RequireAuth({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/reservations" replace />;
}

function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: '/calendar', label: 'Calendar', always: true },
    { to: '/reservations', label: 'Reservations', always: true },
    { to: '/currency-config', label: 'Currency Config', admin: true },
    { to: '/hall-setup', label: 'Hall Setup', admin: true },
    { to: '/menus', label: 'Menus', admin: true },
    { to: '/availability-test', label: 'Avail. Test', always: true },
  ].filter(i => i.always || (i.admin && isAdmin));

  return (
    <div className="min-h-screen flex flex-col app-shell" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      <header className="border-b px-3 sm:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-30 app-header"
        style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="app-brand-mark flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black tracking-[0.18em]"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(161,93,3,0.12))', borderColor: 'rgba(245,158,11,0.22)', color: '#fbbf24' }}>
            S
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] app-brand-kicker" style={{ color: 'var(--text-muted)' }}>Hospitality Suite</div>
            <div className="font-black text-base sm:text-lg tracking-[0.02em] app-brand-title truncate">
              Synora Banquet
            </div>
          </div>
        </div>

        <div className="app-header-actions flex items-center justify-between sm:justify-end gap-2 text-sm w-full sm:w-auto">
          <span className="text-xs sm:text-sm font-medium px-2.5 py-1.5 rounded-xl app-user-pill truncate" style={{ background: 'rgba(148,163,184,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>{user?.username}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all border app-toggle-btn"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)', background: 'linear-gradient(135deg, var(--bg-hover), rgba(255,255,255,0.02))' }}
            >
              {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
            </button>
            <button onClick={logout}
              className="px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border border-red-500/30 transition-all hover:border-red-400/60 app-signout-btn"
              style={{ color: '#fca5a5', background: 'linear-gradient(135deg, rgba(127,29,29,0.22), rgba(127,29,29,0.12))' }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 app-shell-body">
        <aside className="w-64 p-4 app-sidebar" style={{ borderColor: 'var(--border-color)' }}>
          <div className="mb-4 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Navigation</p>
          </div>

          <nav className="space-y-2 app-nav-list">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => isActive ? 'app-nav-item is-active' : 'app-nav-item'}
                style={({ isActive }) => ({ color: isActive ? 'var(--amber-strong)' : 'var(--text-secondary)' })}
              >
                {({ isActive }) => (
                  <>
                    <span className="app-nav-dot" style={{ backgroundColor: isActive ? 'var(--amber-strong)' : 'var(--border-color)', boxShadow: isActive ? '0 0 16px rgba(245,158,11,0.5)' : 'none' }} />
                    <span className="app-nav-label">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 app-main" style={{ backgroundColor: 'var(--bg-primary)', transition: 'background-color 0.3s ease' }}>
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function ReservationsRouter() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <BanquetReservationForm
        onCreated={() => { setShowForm(false); }}
        onCancel={() => setShowForm(false)}
      />
    );
  }
  return <Reservations onNew={() => setShowForm(true)} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/calendar" element={<BanquetCalendar />} />
            <Route path="/reservations" element={<ReservationsRouter />} />
            <Route path="/reservations/:id/folio" element={<BanquetFolio />} />
            <Route path="/travel-agents" element={<TravelAgentManagement />} />
            <Route path="/reports" element={<BanquetReports />} />
            <Route path="/currency-config" element={<RequireAdmin><CurrencyConfig /></RequireAdmin>} />
            <Route path="/gl-ledger" element={<RequireAdmin><GLLedger /></RequireAdmin>} />
            <Route path="/account-mapping" element={<RequireAdmin><AccountMapping /></RequireAdmin>} />
            <Route path="/hall-setup" element={<RequireAdmin><HallSetup /></RequireAdmin>} />
            <Route path="/menus" element={<RequireAdmin><MenuBuilder /></RequireAdmin>} />
            <Route path="/availability-test" element={<AvailabilityTest />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
