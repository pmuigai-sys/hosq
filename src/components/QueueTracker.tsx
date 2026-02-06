import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';

interface QueueTrackerProps {
  queueNumber: string;
}

export function QueueTracker({ queueNumber }: QueueTrackerProps) {
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`queue_${queueNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `queue_number=eq.${queueNumber}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueNumber]);

  const fetchData = async () => {
    try {
      const [entryResult, stagesResult] = await Promise.all([
        supabase
          .from('queue_entries')
          .select(`
            *,
            patients(full_name, phone_number),
            queue_stages(display_name, name, order_number)
          `)
          .eq('queue_number', queueNumber)
          .maybeSingle(),
        supabase
          .from('queue_stages')
          .select('*')
          .eq('is_active', true)
          .order('order_number', { ascending: true }),
      ]);

      if (entryResult.data) setQueueEntry(entryResult.data);
      if (stagesResult.data) setStages(stagesResult.data);
    } catch (error) {
      console.error('Error fetching queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!queueEntry) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Queue entry not found</p>
      </div>
    );
  }

  const currentStageOrder = queueEntry.queue_stages?.order_number || 0;
  const isCompleted = queueEntry.status === 'completed';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {queueEntry.patients?.full_name}
            </h2>
            <p className="text-gray-600">Queue #{queueEntry.queue_number}</p>
          </div>
          <div
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : queueEntry.has_emergency_flag
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isCompleted
              ? 'Completed'
              : queueEntry.has_emergency_flag
              ? 'Priority'
              : 'In Queue'}
          </div>
        </div>

        {!isCompleted && queueEntry.position_in_queue && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Position in current queue
              </p>
              <p className="text-2xl font-bold text-blue-600">
                #{queueEntry.position_in_queue}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Your Journey</h3>
        {stages.map((stage, index) => {
          const isPast = stage.order_number < currentStageOrder;
          const isCurrent = stage.order_number === currentStageOrder;
          const isFuture = stage.order_number > currentStageOrder;

          return (
            <div key={stage.id} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isPast || (isCurrent && queueEntry.status === 'in_service')
                      ? 'bg-green-500'
                      : isCurrent
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-200'
                  }`}
                >
                  {isPast || (isCurrent && queueEntry.status === 'in_service') ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-white font-bold">{index + 1}</span>
                  )}
                </div>
                {index < stages.length - 1 && (
                  <div
                    className={`w-0.5 h-12 ${
                      isPast ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 pb-8">
                <h4
                  className={`font-medium ${
                    isCurrent ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {stage.display_name}
                  {isCurrent && (
                    <span className="ml-2 text-sm text-blue-600">
                      {queueEntry.status === 'in_service'
                        ? '(In Progress)'
                        : '(Current)'}
                    </span>
                  )}
                </h4>
                {isCurrent && queueEntry.status === 'waiting' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Please wait, you'll be called soon
                  </p>
                )}
                {isPast && (
                  <p className="text-sm text-green-600 mt-1">Completed</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isCompleted && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <p className="font-medium">
              Your visit is complete. Thank you for your patience!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
