import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useQueueStages } from '../hooks/useQueue';
import { sendSMS } from '../lib/sms';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function PatientPortal() {
  const [step, setStep] = useState<'form' | 'tracking'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queueEntryId, setQueueEntryId] = useState('');
  const [queueNumber, setQueueNumber] = useState('');

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
      let patientId = '';
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone_number', formData.phoneNumber)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase
          .from('patients')
          .update({
            full_name: formData.fullName,
            age: formData.age ? parseInt(formData.age) : null,
            visit_reason: formData.visitReason,
          })
          .eq('id', patientId);
      } else {
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            phone_number: formData.phoneNumber,
            full_name: formData.fullName,
            age: formData.age ? parseInt(formData.age) : null,
            visit_reason: formData.visitReason,
          })
          .select()
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      const firstStage = stages[0];
      if (!firstStage) throw new Error('No stages available');

      const { data: queueEntry, error: queueError } = await supabase
        .from('queue_entries')
        .insert({
          patient_id: patientId,
          current_stage_id: firstStage.id,
          status: 'waiting',
        })
        .select()
        .single();

      if (queueError) throw queueError;

      await supabase.from('queue_history').insert({
        queue_entry_id: queueEntry.id,
        stage_id: firstStage.id,
      });

      await sendSMS(
        formData.phoneNumber,
        `Hello ${formData.fullName}, you have been registered with queue number ${queueEntry.queue_number}. You are at ${firstStage.display_name}. Track your status at this page.`,
        patientId,
        queueEntry.id
      );

      setQueueEntryId(queueEntry.id);
      setQueueNumber(queueEntry.queue_number);
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

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Track your position in real-time below. You'll receive SMS notifications when it's your turn.
            </p>
          </div>

          <button
            onClick={() => {
              setStep('form');
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
              Include country code (e.g., +1 for US)
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
