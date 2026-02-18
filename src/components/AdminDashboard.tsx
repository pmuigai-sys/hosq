import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createConfirmedUser } from '../lib/supabase-admin';
import type { Database } from '../lib/database.types';
import {
  Users,
  Settings,
  UserPlus,
  Shield,
  AlertTriangle,
} from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
  department: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

interface QueueStage {
  id: string;
  name: string;
  display_name: string;
  order_number: number;
  is_active: boolean;
}

interface EmergencyFlag {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'stages' | 'flags'>('users');
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [stages, setStages] = useState<QueueStage[]>([]);
  const [flags, setFlags] = useState<EmergencyFlag[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{
    state: 'checking' | 'ok' | 'error';
    message: string;
  }>({ state: 'checking', message: 'Checking SMS function...' });
  const [testSmsNumber, setTestSmsNumber] = useState('');
  const [testSmsMessage, setTestSmsMessage] = useState('Test message from Hospital Queue System');
  const [testSmsStatus, setTestSmsStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testSmsError, setTestSmsError] = useState<string>('');

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'receptionist',
    department: '',
    email_verified: false,
  });

  useEffect(() => {
    fetchEmployees();
    fetchStages();
    fetchFlags();
    checkSmsFunction();
  }, []);

  const checkSmsFunction = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-health`,
        {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        setSmsStatus({
          state: 'error',
          message: `SMS health check failed (HTTP ${response.status}). Redeploy the function.`,
        });
        return;
      }

      const data = await response.json();
      if (!data.ok) {
        const missing = Array.isArray(data.missing) ? data.missing.join(', ') : 'Unknown';
        setSmsStatus({
          state: 'error',
          message: `SMS secrets missing: ${missing}. Set Edge Function secrets and redeploy.`,
        });
        return;
      }

      setSmsStatus({
        state: 'ok',
        message: 'SMS function healthy and secrets present.',
      });
    } catch (error) {
      setSmsStatus({
        state: 'error',
        message: 'SMS function not reachable. Check CORS/function deploy.',
      });
    }
  };

  const handleTestSms = async () => {
    if (!testSmsNumber.trim()) {
      setTestSmsStatus('error');
      setTestSmsError('Enter a phone number (with country code).');
      return;
    }

    setTestSmsStatus('sending');
    setTestSmsError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: testSmsNumber.trim(),
            message: testSmsMessage.trim() || 'Test message from Hospital Queue System',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setTestSmsStatus('error');
        setTestSmsError(data?.error || 'Failed to send test SMS');
        return;
      }

      setTestSmsStatus('sent');
    } catch (error) {
      setTestSmsStatus('error');
      setTestSmsError('Network error sending test SMS');
    }
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
    }
    setEmployees(data || []);
  };

  const fetchStages = async () => {
    const { data } = await supabase
      .from('queue_stages')
      .select('*')
      .order('order_number', { ascending: true });
    setStages(data || []);
  };

  const fetchFlags = async () => {
    const { data } = await supabase
      .from('emergency_flags')
      .select('*')
      .order('name', { ascending: true });
    setFlags(data || []);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use Admin API to create user with auto-confirmed email
      const result = await createConfirmedUser(
        newUser.email,
        newUser.password,
        {
          role: newUser.role,
          department: newUser.department,
        }
      );

      if (!result.success || !result.userId) {
        throw new Error(result.error || 'User creation failed');
      }

      // Create user role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: result.userId,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department || null,
        email_verified: newUser.email_verified,
        is_active: true,
      } as Database['public']['Tables']['user_roles']['Insert']);

      if (roleError) throw roleError;

      // Show success message
      alert(
        `User created successfully!

` +
        `Email: ${newUser.email}
` +
        `Role: ${newUser.role}
` +
        `Email Confirmed: Yes (via Admin API)

` +
        `The user can now log in immediately!`
      );

      setShowAddUser(false);
      setNewUser({
        email: '',
        password: '',
        role: 'receptionist',
        department: '',
        email_verified: false,
      });
      fetchEmployees();
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      // Check if it's a service key error
      if (errorMessage.includes('Admin client not initialized') || errorMessage.includes('VITE_SUPABASE_SERVICE_ROLE_KEY') || errorMessage.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        alert(
          `Admin API not configured!

` +
          `To create users properly, you need to:

` +
          `1. Get your Service Role Key from:
` +
          `   Supabase Dashboard -> Settings -> API -> service_role

` +
          `2. Add it to your .env.local file:
` +
          `   VITE_SUPABASE_SERVICE_ROLE_KEY=your_key_here

` +
          `3. Restart the dev server (npm run dev)

` +
          `Error: ${errorMessage}`
        );
      } else {
        alert(
          `Failed to create user: ${errorMessage}

` +
          `Please check the console for more details.`
        );
      }
    } finally {
      setLoading(false);
    }
  };


  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) {
        console.error('Error toggling user status:', error);
        alert(`Failed to update user status: ${error.message}`);
        return;
      }

      fetchEmployees();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ email_verified: !currentStatus })
        .eq('user_id', userId);

      if (error) {
        console.error('Error toggling verification:', error);
        alert(`Failed to update verification status: ${error.message}`);
        return;
      }

      fetchEmployees();
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const handleToggleStage = async (stageId: string, currentStatus: boolean) => {
    await supabase
      .from('queue_stages')
      .update({ is_active: !currentStatus })
      .eq('id', stageId);
    fetchStages();
  };

  const handleToggleFlag = async (flagId: string, currentStatus: boolean) => {
    await supabase
      .from('emergency_flags')
      .update({ is_active: !currentStatus })
      .eq('id', flagId);
    fetchFlags();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage users, queue stages, and emergency flags
          </p>
        </div>
        <div
          className={`mb-6 rounded-lg border p-4 text-sm ${
            smsStatus.state === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : smsStatus.state === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}
        >
          <div className="font-semibold mb-1">SMS Status</div>
          <div>{smsStatus.message}</div>
        </div>
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div className="font-semibold mb-3">Send Test SMS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1234567890"
                value={testSmsNumber}
                onChange={(e) => setTestSmsNumber(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Message
              </label>
              <input
                type="text"
                value={testSmsMessage}
                onChange={(e) => setTestSmsMessage(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleTestSms}
              disabled={testSmsStatus === 'sending'}
              className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              {testSmsStatus === 'sending' ? 'Sending...' : 'Send Test SMS'}
            </button>
            {testSmsStatus === 'sent' && (
              <span className="text-green-700">Test SMS sent.</span>
            )}
            {testSmsStatus === 'error' && (
              <span className="text-red-700">{testSmsError}</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Staff Management
              </button>
              <button
                onClick={() => setActiveTab('stages')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'stages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Queue Stages
              </button>
              <button
                onClick={() => setActiveTab('flags')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${activeTab === 'flags'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Emergency Flags
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Staff Members
                  </h2>
                  <button
                    onClick={() => setShowAddUser(!showAddUser)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Staff Member
                  </button>
                </div>

                {showAddUser && (
                  <form
                    onSubmit={handleCreateUser}
                    className="bg-gray-50 rounded-lg p-6 mb-6"
                  >
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Create New Staff Account
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={newUser.email}
                          onChange={(e) =>
                            setNewUser({ ...newUser, email: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={newUser.password}
                          onChange={(e) =>
                            setNewUser({ ...newUser, password: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role
                        </label>
                        <select
                          value={newUser.role}
                          onChange={(e) =>
                            setNewUser({ ...newUser, role: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="receptionist">Receptionist</option>
                          <option value="doctor">Doctor</option>
                          <option value="billing">Billing</option>
                          <option value="pharmacist">Pharmacist</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department (Optional)
                        </label>
                        <input
                          type="text"
                          value={newUser.department}
                          onChange={(e) =>
                            setNewUser({ ...newUser, department: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-8">
                        <input
                          type="checkbox"
                          id="email_verified"
                          checked={newUser.email_verified}
                          onChange={(e) =>
                            setNewUser({ ...newUser, email_verified: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="email_verified" className="text-sm font-medium text-gray-700">
                          Mark as Verified
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {loading ? 'Creating...' : 'Create Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddUser(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((emp: StaffMember) => (
                        <tr key={emp.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {emp.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {emp.role}
                              </span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {emp.department || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full text-center ${emp.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                  }`}
                              >
                                {emp.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full text-center ${emp.email_verified
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}
                              >
                                {emp.email_verified ? 'Verified' : 'Pending'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() =>
                                  handleToggleUserStatus(emp.user_id, emp.is_active)
                                }
                                className="text-sm text-left text-blue-600 hover:text-blue-800"
                              >
                                {emp.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleVerification(emp.user_id, emp.email_verified)
                                }
                                className="text-sm text-left text-indigo-600 hover:text-indigo-800"
                              >
                                {emp.email_verified ? 'Unverify' : 'Verify Email'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'stages' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Queue Stages
                </h2>
                <div className="space-y-4">
                  {stages.map((stage: QueueStage) => (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {stage.display_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Order: {stage.order_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${stage.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {stage.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() =>
                            handleToggleStage(stage.id, stage.is_active)
                          }
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {stage.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'flags' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Emergency Flags
                </h2>
                <div className="space-y-4">
                  {flags.map((flag: EmergencyFlag) => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{flag.name}</h3>
                        <p className="text-sm text-gray-600">
                          {flag.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${flag.is_active
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {flag.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => handleToggleFlag(flag.id, flag.is_active)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {flag.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
