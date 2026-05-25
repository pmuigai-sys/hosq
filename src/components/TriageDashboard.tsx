import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueueEntries, useQueueStages, useEmergencyFlags } from '../hooks/useQueue';
import { supabase } from '../lib/supabase';
import { notifyPatientStageChange } from '../lib/sms';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Phone,
  User,
  Users,
  Zap,
} from 'lucide-react';

export function TriageDashboard() {
  const { userRole } = useAuth();
  const { stages } = useQueueStages();
  const { flags } = useEmergencyFlags();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [elevateOpenId, setElevateOpenId] = useState<string | null>(null);

  // Find triage stage ID
  const triageStage = stages.find(
    (s) =>
      s.name?.toLowerCase().includes('triage') ||
      s.display_name?.toLowerCase().includes('triage')
  ) || stages[1]; // fallback: second stage

  const { entries, refresh } = useQueueEntries(triageStage?.id, 'all');

  const activeEntries = entries.filter(
    (e) => e.status !== 'completed' && e.status !== 'cancelled'
  );

  const receptionStage = stages[0]; // first stage = reception

  // Elevate: add an emergency flag to bump the patient to top of queue
  const handleElevate = async (entryId: string, flagId: string) => {
    setProcessingId(entryId);
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
      setElevateOpenId(null);
      refresh();
    } catch (err) {
      console.error('Error elevating case:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Send patient back to reception stage
  const handleSendToReception = async (entryId: string) => {
    if (!receptionStage) return;
    setProcessingId(entryId);
    try {
      await supabase
        .from('queue_history')
        .update({ exited_at: new Date().toISOString() })
        .eq('queue_entry_id', entryId)
        .is('exited_at', null);

      await supabase
        .from('queue_entries')
        .update({
          current_stage_id: receptionStage.id,
          status: 'waiting',
        })
        .eq('id', entryId);

      await supabase.from('queue_history').insert({
        queue_entry_id: entryId,
        stage_id: receptionStage.id,
      });

      await notifyPatientStageChange(
        entryId,
        receptionStage.display_name,
        entries.find((e) => e.id === entryId)?.queue_number || ''
      );

      refresh();
    } catch (err) {
      console.error('Error sending to reception:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Call patient (mark in_service)
  const handleCall = async (entryId: string) => {
    setProcessingId(entryId);
    try {
      await supabase.from('queue_entries').update({ status: 'in_service' }).eq('id', entryId);
      if (triageStage) {
        await supabase.from('queue_history').insert({
          queue_entry_id: entryId,
          stage_id: triageStage.id,
          served_by_user_id: userRole?.user_id,
        });
      }
      refresh();
    } catch (err) {
      console.error('Error calling patient:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Move to next stage (doctor)
  const handleMoveNext = async (entryId: string) => {
    setProcessingId(entryId);
    try {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      const currentIndex = stages.findIndex((s) => s.id === entry.current_stage_id);
      const nextStage = stages[currentIndex + 1];

      await supabase
        .from('queue_history')
        .update({ exited_at: new Date().toISOString() })
        .eq('queue_entry_id', entryId)
        .is('exited_at', null);

      if (nextStage) {
        await supabase
          .from('queue_entries')
          .update({ current_stage_id: nextStage.id, status: 'waiting' })
          .eq('id', entryId);

        await supabase.from('queue_history').insert({
          queue_entry_id: entryId,
          stage_id: nextStage.id,
        });

        await notifyPatientStageChange(entryId, nextStage.display_name, entry.queue_number);
      } else {
        await supabase
          .from('queue_entries')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', entryId);
      }

      refresh();
    } catch (err) {
      console.error('Error moving patient:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const waiting = activeEntries.filter((e) => e.status === 'waiting');
  const inService = activeEntries.filter((e) => e.status === 'in_service');
  const priority = activeEntries.filter((e) => e.has_emergency_flag);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Triage Dashboard</h1>
          <p className="text-gray-500 text-sm">
            {triageStage ? triageStage.display_name : 'Triage'} — manage and escalate cases
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Waiting</p>
                <p className="text-3xl font-bold text-blue-600">{waiting.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">In Triage</p>
                <p className="text-3xl font-bold text-green-600">{inService.length}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-500 mb-1">Priority</p>
                <p className="text-3xl font-bold text-red-600">{priority.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-800">{activeEntries.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Queue table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Triage Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queue #
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      No patients in triage queue
                    </td>
                  </tr>
                ) : (
                  activeEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={entry.has_emergency_flag ? 'bg-red-50' : undefined}
                    >
                      {/* Queue # */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-lg">
                            {entry.queue_number}
                          </span>
                          {entry.has_emergency_flag && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              PRIORITY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {entry.patients?.full_name}
                            </p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {entry.patients?.phone_number}
                              {entry.patients?.age && ` · ${entry.patients.age}y`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-4 max-w-xs">
                        <span className="text-sm text-gray-600">
                          {entry.patients?.visit_reason || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.status === 'waiting'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {entry.status === 'waiting' ? 'Waiting' : 'In Triage'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.status === 'waiting' && (
                            <button
                              onClick={() => handleCall(entry.id)}
                              disabled={processingId === entry.id}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              Call
                            </button>
                          )}

                          {entry.status === 'in_service' && (
                            <button
                              onClick={() => handleMoveNext(entry.id)}
                              disabled={processingId === entry.id}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              To Doctor <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {/* Emergency elevation */}
                          {!entry.has_emergency_flag && flags.length > 0 && (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setElevateOpenId(
                                    elevateOpenId === entry.id ? null : entry.id
                                  )
                                }
                                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" />
                                Elevate
                              </button>
                              {elevateOpenId === entry.id && (
                                <div className="absolute z-10 right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
                                    Select priority flag
                                  </p>
                                  {flags.map((flag) => (
                                    <button
                                      key={flag.id}
                                      onClick={() => handleElevate(entry.id, flag.id)}
                                      disabled={processingId === entry.id}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                    >
                                      {flag.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Send back to reception */}
                          {receptionStage && (
                            <button
                              onClick={() => handleSendToReception(entry.id)}
                              disabled={processingId === entry.id}
                              title="Send back to receptionist"
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50 flex items-center gap-1"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              Reception
                            </button>
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
