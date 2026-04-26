import { useEffect, useRef, useMemo } from 'react';
import { db } from '../lib/instant';
import { notifyPositionChange } from '../lib/sms';

export function useQueueEntries(stageId?: string, status: string = 'waiting') {
  const previousEntriesRef = useRef<Map<string, number>>(new Map());

  // Build where clause conditionally
  const whereClause: any = {};
  if (status !== 'all') {
    whereClause.status = status;
  }
  if (stageId) {
    whereClause.current_stage = stageId;
  }

  const { isLoading, data, error } = db.useQuery({
    queue_entries: {
      $: Object.keys(whereClause).length > 0 ? {
        where: whereClause,
        order: { serverCreatedAt: 'asc' }
      } : {
        order: { serverCreatedAt: 'asc' }
      },
      patient: {},
      current_stage: {}
    }
  });

  const entries = useMemo(() => {
    const rawEntries = (data as any)?.queue_entries || [];
    return rawEntries.map((entry: any) => ({
      ...entry,
      patients: entry.patient,
      queue_stages: entry.current_stage
    })).sort((a: any, b: any) => {
      if (a.has_emergency_flag && !b.has_emergency_flag) return -1;
      if (!a.has_emergency_flag && b.has_emergency_flag) return 1;
      return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
    });
  }, [data]);

  useEffect(() => {
    if (isLoading) return;

    entries.forEach((entry: any) => {
      const previousPosition = previousEntriesRef.current.get(entry.id);
      const currentPosition = entry.position_in_queue;

      if (
        previousPosition !== undefined &&
        currentPosition !== null &&
        previousPosition !== currentPosition &&
        currentPosition < previousPosition
      ) {
        notifyPositionChange(
          entry.id,
          currentPosition,
          entry.queue_number,
          entry.queue_stages?.display_name || 'counter'
        ).catch((err) =>
          console.error('Error sending position change notification:', err)
        );
      }

      if (currentPosition !== null) {
        previousEntriesRef.current.set(entry.id, currentPosition);
      }
    });
  }, [entries, isLoading]);

  return { entries, loading: isLoading, error, refresh: () => {} };
}

export function useQueueStages() {
  const { isLoading, data, error } = db.useQuery({
    queue_stages: {
      $: {
        where: { is_active: true },
        order: { serverCreatedAt: 'asc' }
      }
    }
  });

  // Client-side sort by order_number
  const stages = useMemo(() => {
    const rawStages = (data as any)?.queue_stages || [];
    return [...rawStages].sort((a: any, b: any) => (a.order_number || 0) - (b.order_number || 0));
  }, [data]);

  return { stages, loading: isLoading, error };
}

export function useEmergencyFlags() {
  const { isLoading, data, error } = db.useQuery({
    emergency_flags: {
      $: {
        where: { is_active: true },
        order: { serverCreatedAt: 'asc' }
      }
    }
  });

  // Client-side sort by name
  const flags = useMemo(() => {
    const rawFlags = (data as any)?.emergency_flags || [];
    return [...rawFlags].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [data]);

  return { flags, loading: isLoading, error };
}
