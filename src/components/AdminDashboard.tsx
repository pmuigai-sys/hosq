import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Settings,
  UserPlus,
  Shield,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'stages' | 'flags'>('users');
  const [employees, setEmployees] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'receptionist',
    department: '',
  });

  useEffect(() => {
    fetchEmployees();
    fetchStages();
    fetchFlags();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('*, auth_users:user_id(*)')
      .order('created_at', { ascending: false });
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: newUser.role,
        department: newUser.department || null,
      });

      if (roleError) throw roleError;

      setShowAddUser(false);
      setNewUser({ email: '', password: '', role: 'receptionist', department: '' });
      fetchEmployees();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    await supabase
      .from('user_roles')
      .update({ is_active: !currentStatus })
      .eq('user_id', userId);
    fetchEmployees();
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

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Staff Management
              </button>
              <button
                onClick={() => setActiveTab('stages')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'stages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Queue Stages
              </button>
              <button
                onClick={() => setActiveTab('flags')}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'flags'
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
                      {employees.map((emp) => (
                        <tr key={emp.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {emp.user_id}
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
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                emp.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                handleToggleUserStatus(emp.user_id, emp.is_active)
                              }
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {emp.is_active ? 'Deactivate' : 'Activate'}
                            </button>
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
                  {stages.map((stage) => (
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
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            stage.is_active
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
                  {flags.map((flag) => (
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
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            flag.is_active
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
