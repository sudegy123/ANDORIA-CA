/**
 * ANDORIA CRM — PROJECT STATUS WORKFLOW
 * project-status.js
 *
 * The single source of truth for the Project (fulfillment) pipeline —
 * same role status.js plays for Requests. See supabase/migrations
 * /20260101000012 for why this is a separate, longer pipeline from
 * Status: a project only exists once a request converts, and tracks
 * money/installation milestones a lead-stage request never needs.
 *
 * Pipeline: Draft -> Quotation Sent -> Approved -> Deposit Paid ->
 * Installation Started -> Installation Complete -> Final Payment
 * Pending -> Completed, with Cancelled reachable from any non-terminal
 * stage. No backward moves, same rule Status.js follows.
 */

'use strict';

const ProjectStatus = (() => {

  const ORDER = [
    'DRAFT',
    'QUOTATION_SENT',
    'APPROVED',
    'DEPOSIT_PAID',
    'INSTALLATION_STARTED',
    'INSTALLATION_COMPLETE',
    'FINAL_PAYMENT_PENDING',
    'COMPLETED',
  ];
  const CANCELLED = 'CANCELLED';

  const TONE = {
    DRAFT:                    { icon: '📝', tone: 'neutral' },
    QUOTATION_SENT:           { icon: '📨', tone: 'gold' },
    APPROVED:                 { icon: '✅', tone: 'gold' },
    DEPOSIT_PAID:             { icon: '💰', tone: 'warning' },
    INSTALLATION_STARTED:     { icon: '🔧', tone: 'warning' },
    INSTALLATION_COMPLETE:    { icon: '📦', tone: 'warning' },
    FINAL_PAYMENT_PENDING:    { icon: '⏳', tone: 'warning' },
    COMPLETED:                { icon: '🏁', tone: 'success' },
    CANCELLED:                { icon: '✕', tone: 'danger' },
  };

  function all() { return ORDER.concat(CANCELLED); }
  function label(status) { return (typeof I18n !== 'undefined') ? I18n.t('crm.projectStatus.' + status) : status; }
  function tone(status) { return (TONE[status] || {}).tone || 'neutral'; }
  function icon(status) { return (TONE[status] || {}).icon || '•'; }
  function isTerminal(status) { return status === 'COMPLETED' || status === CANCELLED; }
  function nextStatus(status) {
    const idx = ORDER.indexOf(status);
    if (idx === -1 || idx === ORDER.length - 1) return null;
    return ORDER[idx + 1];
  }
  function canCancel(status) { return !isTerminal(status); }
  function progressIndex(status) { return ORDER.indexOf(status); }

  return { ORDER, CANCELLED, all, label, tone, icon, isTerminal, nextStatus, canCancel, progressIndex };

})();

if (typeof window !== 'undefined') window.ProjectStatus = ProjectStatus;
if (typeof module !== 'undefined') module.exports = ProjectStatus;
