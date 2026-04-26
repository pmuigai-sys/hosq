import { db } from './instant';

export async function sendSMS(
  to: string,
  message: string,
  patientId?: string,
  queueEntryId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenId = import.meta.env.VITE_BULKSMS_TOKEN_ID;
    const tokenSecret = import.meta.env.VITE_BULKSMS_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      console.warn('BulkSMS credentials missing, skipping SMS');
      return { success: true }; // Skip if not configured
    }

    const formattedPhone = to.startsWith("+") ? to : `+${to}`;
    const url = "https://api.bulksms.com/v1/messages";
    const authHeader = `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;

    const payload = [{ to: formattedPhone, body: message }];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const result = data[0];
    const logStatus = response.status >= 200 && response.status < 300 ? "sent" : "failed";

    // Log to InstantDB
    const logId = crypto.randomUUID();
    const tx = db.tx.sms_logs[logId].update({
      phone_number: formattedPhone,
      message,
      status: logStatus,
      external_id: result?.id || null,
      sent_at: new Date().toISOString(),
    });

    if (patientId) tx.link({ patient: patientId });
    if (queueEntryId) tx.link({ queue_entry: queueEntryId });

    await db.transact(tx);

    if (!response.ok) {
      return { success: false, error: 'Failed to send SMS via BulkSMS' };
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
  const { data } = await db.queryOnce({
    queue_entries: {
      $: {
        where: { id: queueEntryId }
      },
      patient: {}
    }
  });

  const queueEntry = data?.queue_entries?.[0];
  if (!queueEntry || !queueEntry.patient) return;

  const patient = queueEntry.patient;
  const message = `Hello ${patient.full_name}, your queue number ${queueNumber} is now being called! Please proceed to the ${stageName} counter immediately.`;

  await sendSMS(
    patient.phone_number,
    message,
    patient.id,
    queueEntryId
  );
}

export async function notifyPatientStageChange(
  queueEntryId: string,
  stageName: string,
  queueNumber: string
) {
  const { data } = await db.queryOnce({
    queue_entries: {
      $: {
        where: { id: queueEntryId }
      },
      patient: {}
    }
  });

  const queueEntry = data?.queue_entries?.[0];
  if (!queueEntry || !queueEntry.patient) return;

  const patient = queueEntry.patient;
  const message = `Hello ${patient.full_name}, your queue number ${queueNumber} has moved to ${stageName}. Please proceed to the counter when called.`;

  await sendSMS(
    patient.phone_number,
    message,
    patient.id,
    queueEntryId
  );
}

export async function notifyPositionChange(
  queueEntryId: string,
  newPosition: number,
  queueNumber: string,
  stageName: string
) {
  const { data } = await db.queryOnce({
    queue_entries: {
      $: {
        where: { id: queueEntryId }
      },
      patient: {}
    }
  });

  const queueEntry = data?.queue_entries?.[0];
  if (!queueEntry || !queueEntry.patient) return;

  const patient = queueEntry.patient;

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
    patient.id,
    queueEntryId
  );
}
