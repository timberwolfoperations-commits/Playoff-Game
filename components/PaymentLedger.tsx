'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetch';

interface MemberRow {
  id: string;
  group_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  has_paid: boolean;
  profiles: { display_name: string | null } | null;
  groups: { name: string } | null;
}

export default function PaymentLedger() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<MemberRow[]>('/api/admin/members');
      setMembers(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (member: MemberRow) => {
    setTogglingId(member.id);
    try {
      const updated = await fetchJson<{ id: string; has_paid: boolean }>('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, has_paid: !member.has_paid }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, has_paid: updated.has_paid } : m)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update payment status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="rounded-[1.75rem] border border-white/75 bg-[rgba(255,255,255,0.76)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <h2 className="mb-4 font-semibold text-slate-800">Payment Ledger</h2>

      {loading ? (
        <div className="py-8 text-center text-slate-400">Loading…</div>
      ) : error ? (
        <div className="py-8 text-center text-red-600">{error}</div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-slate-400">No members found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.18)]">
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Player
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Group
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Role
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </th>
                <th className="py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[rgba(148,163,184,0.12)] last:border-0 hover:bg-[rgba(244,237,225,0.35)] transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {m.profiles?.display_name ?? m.profile_id.slice(0, 8) + '…'}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {m.groups?.name ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 capitalize">{m.role}</td>
                  <td className="py-3 pr-4">
                    {m.has_paid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        ✓ Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        ✗ Unpaid
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      disabled={togglingId === m.id}
                      onClick={() => void toggle(m)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      {togglingId === m.id
                        ? '…'
                        : m.has_paid
                          ? 'Mark Unpaid'
                          : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
