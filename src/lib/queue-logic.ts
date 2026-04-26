import { db } from './instant';

export async function syncQueuePositions(stageId: string) {
  const { data } = await db.queryOnce({
    queue_entries: {
      $: {
        where: {
          current_stage: stageId,
          status: 'waiting'
        }
      }
    }
  });

  if (!data?.queue_entries) return;

  const sorted = [...data.queue_entries].sort((a, b) => {
    if (a.has_emergency_flag && !b.has_emergency_flag) return -1;
    if (!a.has_emergency_flag && b.has_emergency_flag) return 1;
    return new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime();
  });

  const txSteps = sorted.map((entry, index) => {
    return db.tx.queue_entries[entry.id].update({
      position_in_queue: index + 1,
      updated_at: new Date().toISOString()
    });
  });

  if (txSteps.length > 0) {
    await db.transact(txSteps);
  }
}

export function generateQueueNumber() {
  const date = new Date();
  const dateStr = date.getFullYear() + 
                  String(date.getMonth() + 1).padStart(2, '0') + 
                  String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `Q${dateStr}-${random}`;
}
