import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Activity, Users, Clock } from 'lucide-react';
import type { QueueEntry } from '../hooks/useQueue';

export function TriageDisplay() {
  const [doctorEntries, setDoctorEntries] = useState<QueueEntry[]>([]);
  const [doctorStageName, setDoctorStageName] = useState('Doctor Consultation');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorQueue();

    const channel = supabase
      .channel('triage_display_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => {
        fetchDoctorQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDoctorQueue = async () => {
    try {
      // Find the doctor stage
      const { data: stages } = await supabase
        .from('queue_stages')
        .select('*')
        .eq('is_active', true)
        .order('order_number', { ascending: true });

      if (!stages || stages.length === 0) return;

      // Use the stage with "doctor" in name/display_name, else the last active stage
      const doctorStage =
        stages.find(
          (s) =>
            s.name?.toLowerCase().includes('doctor') ||
            s.display_name?.toLowerCase().includes('doctor') ||
            s.name?.toLowerCase().includes('consultation')
        ) || stages[stages.length - 1];

      setDoctorStageName(doctorStage.display_name);

      const { data, error } = await supabase
        .from('queue_entries')
        .select(
          `*, patients(full_name, phone_number, age, visit_reason), queue_stages(display_name, name)`
        )
        .eq('current_stage_id', doctorStage.id)
        .in('status', ['waiting', 'in_service'])
        .order('has_emergency_flag', { ascending: false })
        .order('checked_in_at', { ascending: true });

      if (error) throw error;
      setDoctorEntries(data || []);
    } catch (err) {
      console.error('Error fetching doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const nowServing = doctorEntries.find((e) => e.status === 'in_service');
  const waiting = doctorEntries.filter((e) => e.status === 'waiting');
  const nextUp = waiting[0];
  const upNext = waiting.slice(1, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Queue Display</h1>
            <p className="text-gray-400 text-sm">{doctorStageName} — Live</p>
          </div>
          <span className="ml-auto flex items-center gap-2 text-green-400 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Waiting</p>
            <p className="text-3xl font-bold text-blue-400">{waiting.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">In Service</p>
            <p className="text-3xl font-bold text-green-400">{nowServing ? 1 : 0}</p>
          </div>
          <div className="bg-red-900/40 border border-red-700/40 rounded-xl p-4 text-center">
            <p className="text-red-300 text-xs uppercase tracking-wider mb-1">Priority</p>
            <p className="text-3xl font-bold text-red-400">
              {doctorEntries.filter((e) => e.has_emergency_flag).length}
            </p>
          </div>
        </div>

        {/* Now Serving */}
        <div
          className={`rounded-2xl p-6 mb-6 border-2 ${
            nowServing
              ? nowServing.has_emergency_flag
                ? 'bg-red-900/30 border-red-500'
                : 'bg-green-900/30 border-green-500'
              : 'bg-gray-800 border-gray-700'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Now Serving
          </p>
          {nowServing ? (
            <div className="flex items-center gap-4">
              <div
                className={`text-5xl font-black ${
                  nowServing.has_emergency_flag ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {nowServing.queue_number}
              </div>
              {nowServing.has_emergency_flag && (
                <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
              )}
              <div className="ml-auto text-right">
                <p className="text-gray-300 text-sm">
                  {nowServing.patients?.visit_reason || '—'}
                </p>
                {nowServing.has_emergency_flag && (
                  <span className="mt-1 inline-block bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    PRIORITY
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-lg">No patient currently being served</p>
          )}
        </div>

        {/* Next Up */}
        {nextUp && (
          <div
            className={`rounded-2xl p-5 mb-6 border ${
              nextUp.has_emergency_flag
                ? 'bg-red-900/20 border-red-700'
                : 'bg-blue-900/20 border-blue-700'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Next Up
            </p>
            <div className="flex items-center gap-4">
              <div
                className={`text-4xl font-black ${
                  nextUp.has_emergency_flag ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {nextUp.queue_number}
              </div>
              {nextUp.has_emergency_flag && (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
              <div className="ml-auto text-right">
                <p className="text-gray-400 text-sm">{nextUp.patients?.visit_reason || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Queue list */}
        {upNext.length > 0 && (
          <div className="bg-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Upcoming</span>
            </div>
            {upNext.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center px-5 py-4 border-b border-gray-700/50 last:border-0 ${
                  entry.has_emergency_flag ? 'bg-red-900/20' : ''
                }`}
              >
                <span className="text-gray-500 text-sm w-6">{i + 2}</span>
                <span
                  className={`text-xl font-bold ml-3 ${
                    entry.has_emergency_flag ? 'text-red-400' : 'text-gray-200'
                  }`}
                >
                  {entry.queue_number}
                </span>
                {entry.has_emergency_flag && (
                  <AlertTriangle className="w-4 h-4 text-red-400 ml-2" />
                )}
                <span className="ml-auto text-gray-500 text-sm">
                  {entry.patients?.visit_reason || '—'}
                </span>
              </div>
            ))}
            {waiting.length > 5 && (
              <div className="px-5 py-3 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {waiting.length - 5} more patient{waiting.length - 5 !== 1 ? 's' : ''} waiting
              </div>
            )}
          </div>
        )}

        {doctorEntries.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg">No patients in queue</p>
          </div>
        )}
      </div>
    </div>
  );
}
