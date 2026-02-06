import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface QueueEntry {
  id: string;
  patient_id: string;
  current_stage_id: string | null;
  queue_number: string;
  position_in_queue: number | null;
  has_emergency_flag: boolean;
  status: string;
  checked_in_at: string;
  notes: string | null;
  patients?: {
    full_name: string;
    phone_number: string;
    age: number | null;
    visit_reason: string | null;
  };
  queue_stages?: {
    display_name: string;
    name: string;
  };
}

export function useQueueEntries(stageId?: string, status: string = 'waiting') {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel('queue_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stageId, status]);

  const fetchEntries = async () => {
    try {
      let query = supabase
        .from('queue_entries')
        .select(`
          *,
          patients(full_name, phone_number, age, visit_reason),
          queue_stages(display_name, name)
        `)
        .eq('status', status)
        .order('has_emergency_flag', { ascending: false })
        .order('checked_in_at', { ascending: true });

      if (stageId) {
        query = query.eq('current_stage_id', stageId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching queue entries:', error);
    } finally {
      setLoading(false);
    }
  };

  return { entries, loading, refresh: fetchEntries };
}

export function useQueueStages() {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('queue_stages')
        .select('*')
        .eq('is_active', true)
        .order('order_number', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching stages:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stages, loading };
}

export function useEmergencyFlags() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_flags')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error fetching emergency flags:', error);
    } finally {
      setLoading(false);
    }
  };

  return { flags, loading };
}
