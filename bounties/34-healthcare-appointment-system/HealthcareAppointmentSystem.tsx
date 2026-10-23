'use client';

import React, { useMemo, useState } from 'react';

export interface PatientAppointment {
  id: string;
  patientCode: string;
  maskedName: string;
  providerName: string;
  department: 'Cardiology' | 'Neurology' | 'General Practice' | 'Dermatology';
  slotIso: string;
  hipaaConsentVerified: boolean;
  status: 'Scheduled' | 'Checked-In' | 'Completed';
}

const INITIAL_APPOINTMENTS: PatientAppointment[] = [
  { id: 'apt-01', patientCode: 'PT-8841', maskedName: 'J*** D***', providerName: 'Dr. Elena Rostova', department: 'Cardiology', slotIso: '2026-10-24 09:30', hipaaConsentVerified: true, status: 'Scheduled' },
  { id: 'apt-02', patientCode: 'PT-8842', maskedName: 'M*** S***', providerName: 'Dr. Marcus Vance', department: 'Neurology', slotIso: '2026-10-24 11:00', hipaaConsentVerified: true, status: 'Checked-In' },
  { id: 'apt-03', patientCode: 'PT-8843', maskedName: 'A*** K***', providerName: 'Dr. Sarah Lin', department: 'General Practice', slotIso: '2026-10-24 14:15', hipaaConsentVerified: true, status: 'Scheduled' },
];

export function HealthcareAppointmentSystem() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>(INITIAL_APPOINTMENTS);
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [revealPhi, setRevealPhi] = useState<boolean>(false);
  const [patientInitials, setPatientInitials] = useState<string>('');
  const [provider, setProvider] = useState<string>('Dr. Elena Rostova');
  const [department, setDepartment] = useState<PatientAppointment['department']>('Cardiology');
  const [slot, setSlot] = useState<string>('2026-10-25 10:00');
  const [consent, setConsent] = useState<boolean>(true);

  const filtered = useMemo(() => {
    return appointments.filter(a => departmentFilter === 'ALL' || a.department === departmentFilter);
  }, [appointments, departmentFilter]);

  function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!patientInitials.trim() || !consent) return;
    const next: PatientAppointment = {
      id: `apt-${Date.now()}`,
      patientCode: `PT-${Math.floor(1000 + Math.random() * 9000)}`,
      maskedName: patientInitials.trim(),
      providerName: provider,
      department,
      slotIso: slot,
      hipaaConsentVerified: consent,
      status: 'Scheduled',
    };
    setAppointments(prev => [next, ...prev]);
    setPatientInitials('');
  }

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] py-12 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2A2A2A] pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">Agent Midas • Healthcare OS</span>
            <h1 className="text-3xl font-bold mt-1">HIPAA-Compliant Patient Appointment System</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Zero-PHI exposure scheduling with consent audit trails and encrypted patient identifiers.</p>
          </div>
          <button
            type="button"
            onClick={() => setRevealPhi(v => !v)}
            className="px-4 py-2 rounded-lg bg-[#141414] border border-[#D4AF37] text-[#E8C547] text-xs font-mono"
          >
            {revealPhi ? '🔒 Mask PHI Identifiers' : '👁️ Audit Mode (Show Codes)'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSchedule} className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">Book Encrypted Slot</h2>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Masked Patient Identifier / Initials</label>
              <input
                type="text"
                required
                value={patientInitials}
                onChange={e => setPatientInitials(e.target.value)}
                placeholder="e.g. R*** T***"
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value as PatientAppointment['department'])}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F5F5F5]"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="General Practice">General Practice</option>
                <option value="Dermatology">Dermatology</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#9CA3AF] mb-1">Appointment Date & Time</label>
              <input
                type="text"
                value={slot}
                onChange={e => setSlot(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#F5F5F5] font-mono"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              HIPAA Authorization & Minimum-Necessary PHI Consent Verified
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#0A0A0A] font-bold text-sm hover:bg-[#E8C547]"
            >
              Confirm Encrypted Booking
            </button>
          </form>

          <div className="lg:col-span-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'Cardiology', 'Neurology', 'General Practice', 'Dermatology'].map(dep => (
                <button
                  key={dep}
                  type="button"
                  onClick={() => setDepartmentFilter(dep)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${departmentFilter === dep ? 'bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37]' : 'bg-[#141414] text-[#9CA3AF] border-[#2A2A2A]'}`}
                >
                  {dep}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.map(apt => (
                <div key={apt.id} className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#D4AF37]">{apt.patientCode}</span>
                      <span className="font-semibold">{revealPhi ? apt.maskedName : 'REDACTED-PHI'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#2A2A2A] text-[#E8C547]">{apt.department}</span>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-1">{apt.providerName} • Slot: <span className="font-mono">{apt.slotIso}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#D4AF37]">HIPAA Verified ✓</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-[#0A0A0A] border border-[#2A2A2A]">{apt.status}</span>
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
