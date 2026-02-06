import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientPortal } from './components/PatientPortal';
import { Login } from './components/Login';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { QueueTracker } from './components/QueueTracker';
import { LogOut, Users, Shield, Activity } from 'lucide-react';

function AppContent() {
  const { user, userRole, signOut, isAdmin, loading } = useAuth();
  const [view, setView] = useState<'patient' | 'staff'>('patient');
  const [trackingNumber, setTrackingNumber] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && userRole) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Hospital Queue System
                  </h1>
                  <p className="text-xs text-gray-600">
                    {userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1)}
                    {userRole.department && ` - ${userRole.department}`}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
      </div>
    );
  }

  return (
    <div>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Hospital Queue System
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('patient')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'patient'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4" />
                Patient Portal
              </button>
              <button
                onClick={() => setView('staff')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'staff'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                Staff Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {view === 'patient' ? (
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Track Your Queue Position
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter your queue number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {trackingNumber && <QueueTracker queueNumber={trackingNumber} />}
            </div>

            <PatientPortal />
          </div>
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
