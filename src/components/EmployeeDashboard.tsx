import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueueEntries, useQueueStages, useEmergencyFlags } from '../hooks/useQueue';
import { supabase } from '../lib/supabase';
import { notifyPatientStageChange } from '../lib/sms';
import {
  Users,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Phone,
  User,
} from 'lucide-react';

export function EmployeeDashboard() {
  const { userRole } = useAuth();
  const { stages } = useQueueStages();
  const { flags } = useEmergencyFlags();
  const [selectedStage, setSelectedStage] = useState<string>('');
  const { entries, refresh } = useQueueEntries(selectedStage || undefined, 'waiting');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleCallNext = async (entryId: string) => {
    setProcessingId(entryId);
    try {
      await supabase
        .from('queue_entries')
        .update({ status: 'in_service' })
        .eq('id', entryId);

      await supabase.from('queue_history').insert({
        queue_entry_id: entryId,
        stage_id: selectedStage,
        served_by_user_id: userRole?.user_id,
      });

      refresh();
    } catch (error) {
      console.error('Error calling patient:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (entryId: string, moveToNext: boolean) => {
    setProcessingId(entryId);
    try {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;

      const currentStageIndex = stages.findIndex(
        (s) => s.id === entry.current_stage_id
      );
      const nextStage = moveToNext ? stages[currentStageIndex + 1] : null;

      await supabase.from('queue_history').update({ exited_at: new Date().toISOString() }).eq('queue_entry_id', entryId).is('exited_at', null);

      if (nextStage) {
        await supabase
          .from('queue_entries')
          .update({
            current_stage_id: nextStage.id,
            status: 'waiting',
          })
          .eq('id', entryId);

        await supabase.from('queue_history').insert({
          queue_entry_id: entryId,
          stage_id: nextStage.id,
        });

        await notifyPatientStageChange(
          entryId,
          nextStage.display_name,
          entry.queue_number
        );
      } else {
        await supabase
          .from('queue_entries')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', entryId);
      }

      refresh();
    } catch (error) {
      console.error('Error completing service:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddEmergencyFlag = async (entryId: string, flagId: string) => {
    try {
      await supabase.from('patient_emergency_flags').insert({
        queue_entry_id: entryId,
        emergency_flag_id: flagId,
        noted_by_user_id: userRole?.user_id,
      });

      await supabase
        .from('queue_entries')
        .update({ has_emergency_flag: true })
        .eq('id', entryId);

      refresh();
    } catch (error) {
      console.error('Error adding emergency flag:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Queue Management
          </h1>
          <p className="text-gray-600">
            {userRole?.role.charAt(0).toUpperCase() + userRole?.role.slice(1)} Dashboard
            {userRole?.department && ` - ${userRole.department}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Waiting</p>
                <p className="text-3xl font-bold text-blue-600">
                  {entries.filter((e) => e.status === 'waiting').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">In Service</p>
                <p className="text-3xl font-bold text-green-600">
                  {entries.filter((e) => e.status === 'in_service').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Priority Cases</p>
                <p className="text-3xl font-bold text-red-600">
                  {entries.filter((e) => e.has_emergency_flag).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Today</p>
                <p className="text-3xl font-bold text-gray-900">
                  {entries.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queue #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No patients in queue
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={entry.has_emergency_flag ? 'bg-red-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {entry.queue_number}
                          </span>
                          {entry.has_emergency_flag && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {entry.patients?.full_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {entry.patients?.phone_number}
                            </span>
                          </div>
                          {entry.patients?.visit_reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.patients.visit_reason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {entry.queue_stages?.display_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-blue-600">
                          #{entry.position_in_queue}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.status === 'waiting'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {entry.status === 'waiting' ? 'Waiting' : 'In Service'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {entry.status === 'waiting' && (
                            <>
                              <button
                                onClick={() => handleCallNext(entry.id)}
                                disabled={processingId === entry.id}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                              >
                                Call
                              </button>
                              {!entry.has_emergency_flag && flags.length > 0 && (
                                <select
                                  onChange={(e) =>
                                    handleAddEmergencyFlag(entry.id, e.target.value)
                                  }
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  defaultValue=""
                                >
                                  <option value="" disabled>
                                    Add Flag
                                  </option>
                                  {flags.map((flag) => (
                                    <option key={flag.id} value={flag.id}>
                                      {flag.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </>
                          )}
                          {entry.status === 'in_service' && (
                            <>
                              <button
                                onClick={() => handleComplete(entry.id, true)}
                                disabled={processingId === entry.id}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1"
                              >
                                Next <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleComplete(entry.id, false)}
                                disabled={processingId === entry.id}
                                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
                              >
                                Done
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
