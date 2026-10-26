'use client';

import React, { useState, useMemo, useEffect } from 'react';

export interface EmployeeProfile {
  id: string;
  fullName: string;
  roleTitle: string;
  department: 'Engineering' | 'Product' | 'Revenue' | 'Operations';
  managerName: string;
  location: string;
  email: string;
}

export interface EmployeeDirectoryProps {
  initialEmployees?: EmployeeProfile[];
  storageKey?: string;
  onChange?: (employees: EmployeeProfile[]) => void | Promise<void>;
}

const DEFAULT_EMPLOYEES: EmployeeProfile[] = [
  {
    id: 'emp-1',
    fullName: 'Victoria Sterling',
    roleTitle: 'VP of Engineering',
    department: 'Engineering',
    managerName: 'Executive Leadership',
    location: 'Austin, TX',
    email: 'victoria@agentmidas.io'
  },
  {
    id: 'emp-2',
    fullName: 'Julian Vance',
    roleTitle: 'Principal Security Architect',
    department: 'Engineering',
    managerName: 'Victoria Sterling',
    location: 'Remote (US)',
    email: 'julian@agentmidas.io'
  },
  {
    id: 'emp-3',
    fullName: 'Clara Moreau',
    roleTitle: 'Head of Partner Revenue',
    department: 'Revenue',
    managerName: 'Executive Leadership',
    location: 'New York, NY',
    email: 'clara@agentmidas.io'
  }
];

function isValidEmployeeList(val: unknown): val is EmployeeProfile[] {
  return (
    Array.isArray(val) &&
    val.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof (e as EmployeeProfile).id === 'string' &&
        typeof (e as EmployeeProfile).fullName === 'string' &&
        typeof (e as EmployeeProfile).roleTitle === 'string' &&
        typeof (e as EmployeeProfile).department === 'string' &&
        typeof (e as EmployeeProfile).email === 'string'
    )
  );
}

export function EmployeeDirectory({
  initialEmployees = DEFAULT_EMPLOYEES,
  storageKey = 'agentmidas_employees_v1',
  onChange
}: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<EmployeeProfile[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('ALL');
  const [fullName, setFullName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [deptInput, setDeptInput] = useState<EmployeeProfile['department']>('Engineering');
  const [managerName, setManagerName] = useState('Victoria Sterling');
  const [location, setLocation] = useState('Remote');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidEmployeeList(parsed) && parsed.length > 0) {
          setEmployees(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (department !== 'ALL' && emp.department !== department) return false;
      if (!q) return true;
      return (
        emp.fullName.toLowerCase().includes(q) ||
        emp.roleTitle.toLowerCase().includes(q) ||
        emp.location.toLowerCase().includes(q) ||
        emp.managerName.toLowerCase().includes(q)
      );
    });
  }, [employees, search, department]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !roleTitle.trim() || !email.trim().includes('@')) {
      setError('Full name, role title, and valid email address are required.');
      return;
    }
    const nextEmp: EmployeeProfile = {
      id: `emp-${Date.now()}`,
      fullName: fullName.trim(),
      roleTitle: roleTitle.trim(),
      department: deptInput,
      managerName: managerName.trim() || 'Executive Leadership',
      location: location.trim() || 'Remote',
      email: email.trim()
    };
    const prev = employees;
    const next = [...employees, nextEmp];
    setEmployees(next);
    setError(null);
    setFullName('');
    setRoleTitle('');
    setEmail('');
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      await onChange?.(next);
    } catch {
      setEmployees(prev);
      setError('Failed to save employee record. Reverted to previous directory.');
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Directory &amp; Org Hierarchy</h2>
          <p className="text-sm text-slate-600">
            Browse team member profiles, reporting lines, and department distributions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'Engineering', 'Product', 'Revenue', 'Operations'].map((dept) => (
            <button
              key={dept}
              type="button"
              aria-pressed={department === dept}
              onClick={() => setDepartment(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                department === dept
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <input
          type="search"
          aria-label="Search employees by name, role, manager, or location"
          placeholder="Search by name, role, reporting manager, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl">
              No team members match your search criteria.
            </div>
          ) : (
            filtered.map((emp) => (
              <div key={emp.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{emp.fullName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                    {emp.department}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">{emp.roleTitle}</div>
                <div className="text-xs text-slate-500">
                  Reports to: <span className="font-medium text-slate-700">{emp.managerName}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {emp.location} &bull; {emp.email}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddEmployee} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Add Team Member</h3>
          <input
            type="text"
            aria-label="Employee full name"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="text"
            aria-label="Employee role title"
            placeholder="Role Title"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <select
            aria-label="Employee department"
            value={deptInput}
            onChange={(e) => setDeptInput(e.target.value as EmployeeProfile['department'])}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Revenue">Revenue</option>
            <option value="Operations">Operations</option>
          </select>
          <input
            type="text"
            aria-label="Reporting manager name"
            placeholder="Reports To (Manager)"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="text"
            aria-label="Employee location"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <input
            type="email"
            aria-label="Employee email"
            placeholder="Work Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm"
          >
            Add to Directory
          </button>
        </form>
      </div>
    </div>
  );
}

export default EmployeeDirectory;
