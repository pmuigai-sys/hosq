import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Activity, Users, Clock, Stethoscope, Scissors } from 'lucide-react';
import type { QueueEntry } from '../hooks/useQueue';

export type Destination = 'Go to Doctor' | 'Go to Theatre';
export const DEFAULT_DESTINATION: Destination = 'Go to Doctor';

const BADGE_STYLES: Record<Destination, { color: string; Icon: typeof Stethoscope }> = {
  'Go to Doctor':  { color: 'bg-blue-600 text-white',  Icon: Stethoscope },
  'Go to Theatre': { color: 'bg-amber-500 text-white', Icon: Scissors    },
};

function DestinationBadge({ destination, size }: { destination: Destination; size: 'sm' | 'md' | 'lg' }) {
  const { color, Icon } = BADGE_STYLES[destination];
  const sizeClass = size === 'lg' ? 'text-base px-3 py-1 gap-1.5' : size === 'md' ? 'text-sm px-2.5 py-0.5 gap-1' : 'text-xs px-2 py-0.5 gap-1';
  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <span className={`inline-flex items-center font-bold rounded-full shrink-0 ${color} ${sizeClass}`}>
      <Icon className={iconSize} />
      {destination}
    </span>
  );
}

export function TriageDisplay() {
  const [doctorEntries, setDoctorEntries] = useState<QueueEntry[]>([]);
  const [doctorStageName, setDoctorStageName] = useState('Doctor Consultation');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [destination, setDestination] = useState<Destination>(DEFAULT_DESTINATION);

  useEffect(() => {
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'destination_message')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.message === 'Go to Theatre') setDestination('Go to Theatre');
      });

    const channel = supabase
      .channel('destination_message_setting')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.destination_message' }, (payload: any) => {
        const msg = payload.new?.value?.message;
        setDestination(msg === 'Go to Theatre' ? 'Go to Theatre' : 'Go to Doctor');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
      const { data: stages } = await supabase
        .from('queue_stages')
        .select('*')
        .eq('is_active', true)
        .order('order_number', { ascending: true });

      if (!stages || stages.length === 0) return;

      // Doctor stage: named 'doctor' or 'consultation', or the stage after triage
      const triageIndex = stages.findIndex(
        (s) => s.name?.toLowerCase().includes('triage') || s.display_name?.toLowerCase().includes('triage')
      );
      const doctorStage =
        stages.find(
          (s) =>
            s.name?.toLowerCase().includes('doctor') ||
            s.display_name?.toLowerCase().includes('doctor') ||
            s.display_name?.toLowerCase().includes('consultation')
        ) ||
        (triageIndex >= 0 && triageIndex + 1 < stages.length ? stages[triageIndex + 1] : null) ||
        stages[stages.length - 1];

      if (!doctorStage) return;

      setDoctorStageName(doctorStage.display_name);

      const { data, error } = await supabase
        .from('queue_entries')
        .select(`*, patients(full_name, age), queue_stages(display_name, name)`)
        .eq('current_stage_id', doctorStage.id)
        .in('status', ['waiting', 'in_service'])
        .order('has_emergency_flag', { ascending: false })
        .order('position_in_queue', { ascending: true })
        .order('checked_in_at', { ascending: true });

      if (error) throw error;
      setDoctorEntries(data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching doctor queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const nowServing = doctorEntries.find((e) => e.status === 'in_service');
  const waiting = doctorEntries.filter((e) => e.status === 'waiting');
  const nextUp = waiting[0];
  const upNext = waiting.slice(1, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 bg-gray-900 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-8 h-8 text-blue-400 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Queue Display</h1>
            <p className="text-gray-400 text-sm">{doctorStageName}</p>
          </div>
          <div className="ml-auto text-right">
            <span className="flex items-center justify-end gap-1.5 text-green-400 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              Live
            </span>
            <p className="text-gray-600 text-xs mt-0.5">
              {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>


        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Waiting</p>
            <p className="text-4xl font-black text-blue-400">{waiting.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">With Doctor</p>
            <p className="text-4xl font-black text-green-400">{nowServing ? 1 : 0}</p>
          </div>
          <div className="bg-red-950/60 border border-red-800/40 rounded-xl p-4 text-center">
            <p className="text-red-400 text-xs uppercase tracking-wider mb-1">Priority</p>
            <p className="text-4xl font-black text-red-400">
              {doctorEntries.filter((e) => e.has_emergency_flag).length}
            </p>
          </div>
        </div>

        {/* Now Serving */}
        <div
          className={`rounded-2xl p-6 mb-5 border-2 transition-colors ${
            nowServing
              ? nowServing.has_emergency_flag
                ? 'bg-red-950/50 border-red-500'
                : 'bg-green-950/50 border-green-500'
              : 'bg-gray-800 border-gray-700'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            Now With Doctor
          </p>
          {nowServing ? (
            <div className="flex items-center gap-4">
              <div>
                <p
                  className={`text-5xl font-black ${
                    nowServing.has_emergency_flag ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  {nowServing.queue_number}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-gray-300 text-lg font-semibold">
                    {nowServing.patients?.full_name}
                  </p>
                  <DestinationBadge destination={destination} size="lg" />
                </div>
              </div>
              {nowServing.has_emergency_flag && (
                <div className="ml-auto flex flex-col items-end gap-2">
                  <AlertTriangle className="w-10 h-10 text-red-400 animate-pulse" />
                  <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Priority
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-lg">No patient currently with doctor</p>
          )}
        </div>

        {/* Next Up */}
        {nextUp && (
          <div
            className={`rounded-2xl p-5 mb-5 border ${
              nextUp.has_emergency_flag
                ? 'bg-red-950/30 border-red-700'
                : 'bg-blue-950/30 border-blue-800'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Next Up
            </p>
            <div className="flex items-center gap-4">
              <div>
                <p
                  className={`text-4xl font-black ${
                    nextUp.has_emergency_flag ? 'text-red-400' : 'text-blue-400'
                  }`}
                >
                  {nextUp.queue_number}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-gray-300 text-base font-semibold">
                    {nextUp.patients?.full_name}
                  </p>
                  <DestinationBadge destination={destination} size="md" />
                </div>
              </div>
              {nextUp.has_emergency_flag && (
                <div className="ml-auto flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                    Priority
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming queue list */}
        {upNext.length > 0 && (
          <div className="bg-gray-800 rounded-2xl overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Upcoming
              </span>
            </div>
            {upNext.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center px-5 py-4 border-b border-gray-700/40 last:border-0 ${
                  entry.has_emergency_flag ? 'bg-red-950/25' : ''
                }`}
              >
                <span className="text-gray-600 text-sm w-5 shrink-0">{i + 2}</span>
                <div className="ml-4 flex items-center gap-3 flex-1 min-w-0">
                  {entry.has_emergency_flag && (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span
                    className={`text-xl font-bold shrink-0 ${
                      entry.has_emergency_flag ? 'text-red-300' : 'text-gray-200'
                    }`}
                  >
                    {entry.queue_number}
                  </span>
                  <span className="text-gray-400 text-sm truncate">
                    {entry.patients?.full_name}
                  </span>
                  <DestinationBadge destination={destination} size="sm" />
                </div>
                {entry.has_emergency_flag && (
                  <span className="ml-auto bg-red-900/60 text-red-300 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                    Priority
                  </span>
                )}
              </div>
            ))}
            {waiting.length > 6 && (
              <div className="px-5 py-3 text-center text-gray-600 text-sm flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {waiting.length - 6} more patient{waiting.length - 6 !== 1 ? 's' : ''} waiting
              </div>
            )}
          </div>
        )}

        {doctorEntries.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <Users className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">No patients waiting for doctor</p>
            <p className="text-sm mt-1 opacity-60">Patients appear here after triage clears them</p>
          </div>
        )}
      </div>
    </div>
  );
}
