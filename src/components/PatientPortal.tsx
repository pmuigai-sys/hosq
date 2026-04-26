import { useState } from 'react';
import { db } from '../lib/instant';
import { useQueueStages } from '../hooks/useQueue';
import { sendSMS } from '../lib/sms';
import { runAutoEmergencyTriage } from '../lib/auto-triage';
import { normalizeKenyanPhone } from '../lib/phone';
import { generateQueueNumber, syncQueuePositions } from '../lib/queue-logic';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function PatientPortal() {
  const [step, setStep] = useState<'form' | 'tracking'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queueNumber, setQueueNumber] = useState('');
  const [emergencyFlagged, setEmergencyFlagged] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    age: '',
    visitReason: '',
  });

  const { stages } = useQueueStages();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizeKenyanPhone(formData.phoneNumber);
      if (!normalizedPhone) {
        throw new Error('Only Kenyan mobile numbers are allowed (e.g., +254712345678 or 0712345678).');
      }

      // Check for existing patient
      const { data: patientData } = await db.queryOnce({
        patients: {
          $: {
            where: { phone_number: normalizedPhone }
          }
        }
      });

      let patientId = patientData?.patients?.[0]?.id;
      if (!patientId) {
        patientId = crypto.randomUUID();
      }

      const firstStage = stages[0];
      if (!firstStage) throw new Error('No stages available');

      const queueEntryId = crypto.randomUUID();
      const historyId = crypto.randomUUID();
      const qNumber = generateQueueNumber();

      // Create patient
      await db.transact(
        db.tx.patients[patientId].update({
          phone_number: normalizedPhone,
          full_name: formData.fullName,
          age: formData.age ? parseInt(formData.age) : undefined,
          visit_reason: formData.visitReason,
          updated_at: new Date().toISOString(),
          created_at: patientData?.patients?.[0]?.created_at || new Date().toISOString(),
        })
      );

      // Create queue entry
      await db.transact(
        db.tx.queue_entries[queueEntryId].update({
          queue_number: qNumber,
          status: 'waiting',
          has_emergency_flag: false,
          checked_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: '',
        })
        .link({ patient: patientId, current_stage: firstStage.id })
      );

      // Create queue history
      await db.transact(
        db.tx.queue_history[historyId].update({
          entered_at: new Date().toISOString(),
        })
        .link({ queue_entry: queueEntryId, stage: firstStage.id })
      );

      const parsedAge = formData.age ? parseInt(formData.age) : undefined;
      const triageResult = await runAutoEmergencyTriage(
        queueEntryId,
        patientId,
        formData.visitReason,
        parsedAge
      );
      if (!triageResult.success) {
        console.warn('Auto triage failed:', triageResult.error);
      } else if (triageResult.flagged) {
        setEmergencyFlagged(true);
      }

      // Sync positions after triage (which might have added emergency flags)
      await syncQueuePositions(firstStage.id);

      const smsResult = await sendSMS(
        normalizedPhone,
        `Hello ${formData.fullName}, you have been registered with queue number ${qNumber}. You are at ${firstStage.display_name}. Track your status at this page.`,
        patientId,
        queueEntryId
      );
      if (!smsResult.success) {
        console.warn('SMS send failed:', smsResult.error);
        setError(smsResult.error || 'SMS failed to send. Please verify SMS configuration.');
      }

      setQueueNumber(qNumber);
      setStep('tracking');
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'tracking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600">
              Your queue number is
            </p>
            <div className="text-4xl font-bold text-blue-600 my-4">
              {queueNumber}
            </div>
          </div>

          {emergencyFlagged && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Priority Case Detected</p>
                <p className="text-sm text-red-700 mt-1">
                  Based on your symptoms, your case has been flagged as a priority emergency. You have been moved to the front of the queue.
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Track your position in real-time below. You'll receive SMS notifications when it's your turn.
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={() => {
              setStep('form');
              setEmergencyFlagged(false);
              setFormData({
                fullName: '',
                phoneNumber: '',
                age: '',
                visitReason: '',
              });
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Register Another Patient
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Patient Check-In
          </h1>
          <p className="text-gray-600">
            Register yourself and join the queue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kenyan mobile numbers only (e.g., +254712345678 or 0712345678)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="25"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Visit *
            </label>
            <textarea
              required
              value={formData.visitReason}
              onChange={(e) => setFormData({ ...formData, visitReason: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your symptoms or reason for visit"
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registering...
              </>
            ) : (
              'Register & Join Queue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
