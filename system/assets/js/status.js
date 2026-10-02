/**
 * ANDORIA CRM — STATUS WORKFLOW
 * status.js
 *
 * The single source of truth for the Request pipeline. CRMStore (shared
 * with the wizard) just persists whatever status string it's given —
 * this module is what decides which transitions are legal and how a
 * status should look/read. Only the CRM pages import this file.
 *
 * Pipeline (Phase 2): New Lead -> Contacted -> Qualified -> Quotation
 * Sent -> Negotiation -> Deposit Paid -> Installation Scheduled ->
 * Installed -> Completed, with Cancelled reachable from any non-terminal
 * stage. No backward moves — keep the workflow simple; add re-opening
 * later if the team needs it.
 *
 * Renamed from the Phase 1 pipeline (new/reviewing/waiting_deposit/
 * installing) — CRMStore transparently upgrades any already-persisted
 * record's status id on load, so this file only ever has to know about
 * the current names.
 */

'use strict';

const Status = (() => {

  const ORDER = [
    'new_lead',
    'contacted',
    'qualified',
    'quotation_sent',
    'negotiation',
    'deposit_paid',
    'installation_scheduled',
    'installed',
    'completed',
  ];
  const CANCELLED = 'cancelled';

  // Visual tone only — maps to a handful of existing semantic tokens
  // (gold/success/warning/danger/neutral), never a new color.
  const TONE = {
    new_lead:                { icon: '🆕', tone: 'gold' },
    contacted:                { icon: '📞', tone: 'neutral' },
    qualified:                { icon: '✅', tone: 'gold' },
    quotation_sent:           { icon: '📨', tone: 'gold' },
    negotiation:              { icon: '🤝', tone: 'warning' },
    deposit_paid:             { icon: '💰', tone: 'warning' },
    installation_scheduled:   { icon: '📅', tone: 'neutral' },
    installed:                { icon: '🔧', tone: 'warning' },
    completed:                { icon: '✅', tone: 'success' },
    cancelled:                { icon: '✕', tone: 'danger' },
  };

  /** All valid status ids, including the terminal 'cancelled'. */
  function all() {
    return ORDER.concat(CANCELLED);
  }

  function label(status) {
    return (typeof I18n !== 'undefined') ? I18n.t('crm.status.' + status) : status;
  }

  function tone(status) {
    return (TONE[status] || {}).tone || 'neutral';
  }

  function icon(status) {
    return (TONE[status] || {}).icon || '•';
  }

  function isTerminal(status) {
    return status === 'completed' || status === CANCELLED;
  }

  /** The single next forward stage, or null once terminal. */
  function nextStatus(status) {
    const idx = ORDER.indexOf(status);
    if (idx === -1 || idx === ORDER.length - 1) return null;
    return ORDER[idx + 1];
  }

  /** Whether a request currently at `status` can still be cancelled. */
  function canCancel(status) {
    return !isTerminal(status);
  }

  /** 0-based position in the pipeline, for a stepper UI (-1 if cancelled/unknown). */
  function progressIndex(status) {
    return ORDER.indexOf(status);
  }

  return { ORDER, CANCELLED, all, label, tone, icon, isTerminal, nextStatus, canCancel, progressIndex };

})();

if (typeof window !== 'undefined') window.Status = Status;
if (typeof module !== 'undefined') module.exports = Status;
