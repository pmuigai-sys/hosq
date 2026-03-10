import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueueEntries, useQueueStages, useEmergencyFlags } from '../hooks/useQueue';
import { supabase } from '../lib/supabase';
import { notifyPatientStageChange, notifyPatientCalled } from '../lib/sms';
import {
  Users,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Phone,
  User,
  RefreshCw,
  Search,
} from 'lucide-react';

export function EmployeeDashboard() {
  const { userRole } = useAuth();
  const { stages } = useQueueStages();
  const { flags } = useEmergencyFlags();
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_service' | 'emergency'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { entries, refresh } = useQueueEntries(selectedStage || undefined, 'all');
  const [optimisticEntries, setOptimisticEntries] = useState(entries);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const roleLabel = userRole?.role
    ? `${userRole.role.charAt(0).toUpperCase()}${userRole.role.slice(1)}`
    : 'Staff';
  useEffect(() => {
    setOptimisticEntries(entries);
  }, [entries]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStage, showCompleted, statusFilter, searchTerm, pageSize]);

  const activeEntries = optimisticEntries.filter((entry) => entry.status !== 'completed' && entry.status !== 'cancelled');
  const baseEntries = showCompleted ? entries : activeEntries;
  const filteredEntries = baseEntries.filter((entry) => {
    if (statusFilter === 'waiting' && entry.status !== 'waiting') return false;
    if (statusFilter === 'in_service' && entry.status !== 'in_service') return false;
    if (statusFilter === 'emergency' && !entry.has_emergency_flag) return false;

    if (!searchTerm.trim()) return true;
    const needle = searchTerm.toLowerCase();
    return (
      entry.queue_number.toLowerCase().includes(needle) ||
      (entry.patients?.full_name || '').toLowerCase().includes(needle) ||
      (entry.patients?.phone_number || '').toLowerCase().includes(needle)
    );
  });

  const visibleEntries = [...filteredEntries].sort((a, b) => {
    if (a.has_emergency_flag !== b.has_emergency_flag) {
      return a.has_emergency_flag ? -1 : 1;
    }
    const aPos = a.position_in_queue ?? Number.MAX_SAFE_INTEGER;
    const bPos = b.position_in_queue ?? Number.MAX_SAFE_INTEGER;
    if (aPos !== bPos) return aPos - bPos;
    return a.checked_in_at.localeCompare(b.checked_in_at);
  });

  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedEntries = visibleEntries.slice(pageStart, pageStart + pageSize);

  const handleCallNext = async (entryId: string) => {
    setProcessingId(entryId);
    const previousEntries = optimisticEntries;
    try {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;

      setOptimisticEntries((prev) =>
        prev.map((item) => (item.id === entryId ? { ...item, status: 'in_service' } : item))
      );

      await supabase
        .from('queue_entries')
        .update({ status: 'in_service' })
        .eq('id', entryId);

      const stageId = entry.current_stage_id || selectedStage;
      if (!stageId) {
        throw new Error('Missing stage id for queue history');
      }

      await supabase.from('queue_history').insert({
        queue_entry_id: entryId,
        stage_id: stageId,
        served_by_user_id: userRole?.user_id,
      });

      await notifyPatientCalled(
        entryId,
        entry.queue_stages?.display_name || 'counter',
        entry.queue_number
      );

      refresh();
      setActionMessage({ type: 'success', text: `${entry.queue_number} called for service.` });
    } catch (error) {
      console.error('Error calling patient:', error);
      setOptimisticEntries(previousEntries);
      setActionMessage({ type: 'error', text: 'Failed to call patient. Please retry.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (entryId: string, moveToNext: boolean) => {
    const confirmMessage = moveToNext
      ? 'Move this patient to the next stage?'
      : 'Mark this patient as completed?';
    if (!window.confirm(confirmMessage)) return;

    setProcessingId(entryId);
    const previousEntries = optimisticEntries;
    try {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;

      const currentStageIndex = stages.findIndex(
        (s) => s.id === entry.current_stage_id
      );
      const nextStage = moveToNext ? stages[currentStageIndex + 1] : null;

      setOptimisticEntries((prev) =>
        prev.map((item) => {
          if (item.id !== entryId) return item;
          if (nextStage) {
            return {
              ...item,
              current_stage_id: nextStage.id,
              status: 'waiting',
              queue_stages: {
                ...(item.queue_stages || { name: nextStage.name, display_name: nextStage.display_name }),
                name: nextStage.name,
                display_name: nextStage.display_name,
              },
            };
          }
          return { ...item, status: 'completed' };
        })
      );

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
      setActionMessage({
        type: 'success',
        text: moveToNext ? `${entry.queue_number} moved to next stage.` : `${entry.queue_number} marked as completed.`,
      });
    } catch (error) {
      console.error('Error completing service:', error);
      setOptimisticEntries(previousEntries);
      setActionMessage({ type: 'error', text: 'Failed to update service status. Please retry.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddEmergencyFlag = async (entryId: string, flagId: string) => {
    if (!window.confirm('Add this emergency flag and reprioritize this patient?')) return;
    const previousEntries = optimisticEntries;
    try {
      setOptimisticEntries((prev) =>
        prev.map((item) => (item.id === entryId ? { ...item, has_emergency_flag: true } : item))
      );

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
      setActionMessage({ type: 'success', text: 'Emergency flag added and queue reprioritized.' });
    } catch (error) {
      console.error('Error adding emergency flag:', error);
      setOptimisticEntries(previousEntries);
      setActionMessage({ type: 'error', text: 'Failed to add emergency flag.' });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'waiting') return 'bg-amber-100 text-amber-800';
    if (status === 'in_service') return 'bg-emerald-100 text-emerald-800';
    if (status === 'completed') return 'bg-blue-100 text-blue-800';
    if (status === 'cancelled') return 'bg-slate-200 text-slate-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatStatusLabel = (status: string) => status.replace('_', ' ');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Queue Management
          </h1>
          <p className="text-slate-600">
            {roleLabel} Dashboard
            {userRole?.department && ` - ${userRole.department}`}
          </p>
        </div>

        {actionMessage && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              actionMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Waiting</p>
                <p className="text-3xl font-bold text-blue-600">
                  {activeEntries.filter((e) => e.status === 'waiting').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">In Service</p>
                <p className="text-3xl font-bold text-green-600">
                  {activeEntries.filter((e) => e.status === 'in_service').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Priority Cases</p>
                <p className="text-3xl font-bold text-red-600">
                  {activeEntries.filter((e) => e.has_emergency_flag).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Today</p>
                <p className="text-3xl font-bold text-gray-900">
                  {activeEntries.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
              <div>
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

              <div className="w-full lg:w-80">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search patient</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Queue #, name, or phone"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={() => refresh()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'waiting', label: 'Waiting' },
                { key: 'in_service', label: 'In Service' },
                { key: 'emergency', label: 'Emergency' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as 'all' | 'waiting' | 'in_service' | 'emergency')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    statusFilter === filter.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show completed/cancelled
              </label>
              <div className="ml-2 flex items-center gap-2 text-sm text-gray-600">
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-md border border-gray-300 px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queue #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
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
                {pagedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No matching patients found
                    </td>
                  </tr>
                ) : (
                  pagedEntries.map((entry) => (
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
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {entry.patients?.visit_reason || 'Not provided'}
                        </span>
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
                          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(
                            entry.status
                          )}`}
                        >
                          {formatStatusLabel(entry.status)}
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
          {visibleEntries.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <span>
                Showing {pageStart + 1}-{Math.min(pageStart + pageSize, visibleEntries.length)} of {visibleEntries.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <span>Page {safePage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
