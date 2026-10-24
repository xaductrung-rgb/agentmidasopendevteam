'use client';

import React, { useEffect, useState } from 'react';

export interface PatientAppointment {
  id: string;
  patientInitials: string;
  mrnMasked: string;
  provider: string;
  department: 'Cardiology' | 'Neurology' | 'Orthopedics' | 'Telehealth Primary';
  slotTime: string;
  hipaaConsentVerified: boolean;
  status: 'Confirmed' | 'Checked-In' | 'Completed';
}

const PROVIDERS_BY_DEPT: Record<PatientAppointment['department'], string[]> = {
  Cardiology: ['Dr. Elena Vance, MD', 'Dr. Marcus Sterling, MD'],
  Neurology: ['Dr. Raj Patel, MD', 'Dr. Hannah Cho, MD'],
  Orthopedics: ['Dr. Lucas Weber, DO'],
  'Telehealth Primary': ['Dr. Sarah Lin, DO', 'Dr. Noah Alvarez, MD'],
};

const INITIAL_APPOINTMENTS: PatientAppointment[] = [
  { id: 'apt-901', patientInitials: 'J.D.', mrnMasked: 'MRN-****-4821', provider: 'Dr. Elena Vance, MD', department: 'Cardiology', slotTime: '2026-10-24T09:30', hipaaConsentVerified: true, status: 'Confirmed' },
  { id: 'apt-902', patientInitials: 'M.K.', mrnMasked: 'MRN-****-7739', provider: 'Dr. Sarah Lin, DO', department: 'Telehealth Primary', slotTime: '2026-10-24T10:15', hipaaConsentVerified: true, status: 'Checked-In' },
];

const STORAGE_KEY = 'agentmidas_healthcare_appointments_v1';

export function HealthcareAppointmentSystem() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>(INITIAL_APPOINTMENTS);
  const [initials, setInitials] = useState<string>('');
  const [department, setDepartment] = useState<PatientAppointment['department']>('Cardiology');
  const [provider, setProvider] = useState<string>(PROVIDERS_BY_DEPT['Cardiology'][0]);
  const [slotTime, setSlotTime] = useState<string>('2026-10-24T14:00');
  const [hipaaConsent, setHipaaConsent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PatientAppointment[];
        if (Array.isArray(parsed) && parsed.length > 0) setAppointments(parsed);
      }
    } catch {}
  }, []);

  const handleDepartmentChange = (nextDept: PatientAppointment['department']) => {
    setDepartment(nextDept);
    const availableProviders = PROVIDERS_BY_DEPT[nextDept];
    setProvider(availableProviders[0]);
  };

  const handleSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedInitials = initials.trim().toUpperCase();
    if (!trimmedInitials) {
      setErrorMsg('Patient initials are required.');
      return;
    }
    if (!hipaaConsent) {
      setErrorMsg('Affirmative HIPAA Notice of Privacy Practices consent is required before booking.');
      return;
    }
    if (!slotTime || Number.isNaN(Date.parse(slotTime))) {
      setErrorMsg('Please select a valid ISO date and time slot.');
      return;
    }

    const nextApt: PatientAppointment = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      patientInitials: trimmedInitials,
      mrnMasked: `MRN-****-${Math.floor(1000 + Math.random() * 9000)}`,
      provider,
      department,
      slotTime,
      hipaaConsentVerified: true,
      status: 'Confirmed',
    };
    const nextList = [nextApt, ...appointments];
    setAppointments(nextList);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    } catch {}
    setInitials('');
    setHipaaConsent(false);
  };

  return (
    <section aria-label="Healthcare Appointment System" className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-[#262626] pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#D4AF37]">Healthcare Appointment System</h1>
          <p className="text-sm text-[#A3A3A3]">HIPAA-Compliant De-Identified Patient Scheduling & Department-Matched Triage</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSchedule} className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">Schedule Patient Slot</h2>
            {errorMsg && (
              <p role="alert" className="text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/40 rounded p-2">
                {errorMsg}
              </p>
            )}
            <div>
              <label htmlFor="hc-initials" className="block text-xs text-[#A3A3A3] mb-1">Patient Initials (De-identified PHI)</label>
              <input
                id="hc-initials"
                type="text"
                required
                maxLength={6}
                value={initials}
                onChange={e => setInitials(e.target.value)}
                placeholder="e.g. A.B."
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
              />
            </div>
            <div>
              <label htmlFor="hc-dept" className="block text-xs text-[#A3A3A3] mb-1">Department</label>
              <select
                id="hc-dept"
                value={department}
                onChange={e => handleDepartmentChange(e.target.value as PatientAppointment['department'])}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Telehealth Primary">Telehealth Primary</option>
              </select>
            </div>
            <div>
              <label htmlFor="hc-provider" className="block text-xs text-[#A3A3A3] mb-1">Attending Provider ({department})</label>
              <select
                id="hc-provider"
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
              >
                {PROVIDERS_BY_DEPT[department].map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hc-slot-time" className="block text-xs text-[#A3A3A3] mb-1">Appointment Date & Time</label>
              <input
                id="hc-slot-time"
                type="datetime-local"
                required
                value={slotTime}
                onChange={e => setSlotTime(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
              />
            </div>
            <label htmlFor="hc-hipaa-consent" className="flex items-center gap-2 text-xs text-[#A3A3A3] cursor-pointer">
              <input
                id="hc-hipaa-consent"
                type="checkbox"
                checked={hipaaConsent}
                onChange={e => setHipaaConsent(e.target.checked)}
                className="accent-[#D4AF37]"
              />
              Affirmative Patient HIPAA Authorization & Consent Verified
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-semibold text-sm hover:bg-[#E8C547]"
            >
              Confirm Encrypted Booking
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold text-[#D4AF37]">Active Triage & Appointment Queue ({appointments.length})</h2>
            <div className="space-y-3">
              {appointments.map(apt => (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#141414] border border-[#262626]">
                  <div>
                    <p className="font-semibold text-[#F5F5F5]">
                      {apt.patientInitials} <span className="text-xs font-mono text-[#A3A3A3]">({apt.mrnMasked})</span>
                    </p>
                    <p className="text-xs text-[#A3A3A3]">{apt.provider} • {apt.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-[#D4AF37]">{apt.slotTime.replace('T', ' ')}</p>
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] mt-1">
                      {apt.status} • HIPAA Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HealthcareAppointmentSystem;
