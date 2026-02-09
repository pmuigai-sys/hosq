import { supabase } from './supabase';

export async function sendSMS(
  to: string,
  message: string,
  patientId?: string,
  queueEntryId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          message,
          patientId,
          queueEntryId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send SMS' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: 'Network error' };
  }
}

export async function notifyPatientCalled(
  queueEntryId: string,
  stageName: string,
  queueNumber: string
) {
  const { data: queueEntry } = await supabase
    .from('queue_entries')
    .select('patient_id, patients(phone_number, full_name), position_in_queue')
    .eq('id', queueEntryId)
    .maybeSingle();

  if (!queueEntry) return;

  const patient = queueEntry.patients as any;
  const message = `Hello ${patient.full_name}, your queue number ${queueNumber} is now being called! Please proceed to the ${stageName} counter immediately.`;

  await sendSMS(
    patient.phone_number,
    message,
    queueEntry.patient_id,
    queueEntryId
  );
}

export async function notifyPatientStageChange(
  queueEntryId: string,
  stageName: string,
  queueNumber: string
) {
  const { data: queueEntry } = await supabase
    .from('queue_entries')
    .select('patient_id, patients(phone_number, full_name)')
    .eq('id', queueEntryId)
    .maybeSingle();

  if (!queueEntry) return;

  const patient = queueEntry.patients as any;
  const message = `Hello ${patient.full_name}, your queue number ${queueNumber} has moved to ${stageName}. Please proceed to the counter when called.`;

  await sendSMS(
    patient.phone_number,
    message,
    queueEntry.patient_id,
    queueEntryId
  );
}

export async function notifyPositionChange(
  queueEntryId: string,
  newPosition: number,
  queueNumber: string,
  stageName: string
) {
  const { data: queueEntry } = await supabase
    .from('queue_entries')
    .select('patient_id, patients(phone_number, full_name)')
    .eq('id', queueEntryId)
    .maybeSingle();

  if (!queueEntry) return;

  const patient = queueEntry.patients as any;

  let positionText = '';
  if (newPosition === 1) {
    positionText = 'You are NEXT! Be ready.';
  } else if (newPosition === 2) {
    positionText = `You are 2nd in line. Get ready soon.`;
  } else {
    positionText = `Your position: #${newPosition} at ${stageName}`;
  }

  const message = `Hello ${patient.full_name}, queue update for ${queueNumber}: ${positionText}`;

  await sendSMS(
    patient.phone_number,
    message,
    queueEntry.patient_id,
    queueEntryId
  );
}
