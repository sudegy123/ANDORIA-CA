/**
 * ANDORIA CRM — PROJECTS STORE (Repository layer)
 * projects-store.js
 *
 * Phase B Module 11 (Project Workflow). CRM-only (not shared with the
 * customer wizard — projects are internal fulfillment records). Reads go
 * straight through Supabase (RLS: any active staff can SELECT). Writes
 * go through convert_request_to_project()/update_project_status() —
 * SECURITY DEFINER RPCs, same reasoning as every other write-path in
 * this project: atomicity (status change + timeline row + request
 * mirror, all-or-nothing) and a server-enforced role check.
 */

'use strict';

const ProjectsStore = (() => {

  function client() {
    return SupabaseClient.get();
  }

  const SELECT_WITH_PACKAGE = '*, package:packages(id, name_en, name_ar)';

  function mapProject(row) {
    return {
      id: row.id,
      requestId: row.request_id,
      packageId: row.package_id,
      package: row.package ? { id: row.package.id, nameEn: row.package.name_en, nameAr: row.package.name_ar } : null,
      status: row.status,
      assignedSalesId: row.assigned_sales_id,
      materialCost: row.material_cost,
      installationCost: row.installation_cost,
      transportationCost: row.transportation_cost,
      laborCost: row.labor_cost,
      miscCost: row.misc_cost,
      taxPct: row.tax_pct,
      discount: row.discount,
      commissionPct: row.commission_pct,
      sellingPrice: row.selling_price,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      quotationSentAt: row.quotation_sent_at,
      depositPaidAt: row.deposit_paid_at,
      installationStartedAt: row.installation_started_at,
      installationCompleteAt: row.installation_complete_at,
      finalPaymentAt: row.final_payment_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
    };
  }

  function mapTimelineEvent(row) {
    return {
      id: row.id,
      at: row.at,
      type: row.type,
      status: row.status,
      fromStatus: row.from_status,
      text: row.note_text,
      user: row.event_user,
    };
  }

  return {

    /** @returns {Promise<Array>} */
    async list() {
      const { data, error } = await client().from('projects').select(SELECT_WITH_PACKAGE).order('updated_at', { ascending: false });
      if (error) { console.error('[ProjectsStore] list failed:', error); return []; }
      return data.map(mapProject);
    },

    /** @param {string} id @returns {Promise<Object|null>} */
    async get(id) {
      const { data, error } = await client().from('projects').select(SELECT_WITH_PACKAGE).eq('id', id).maybeSingle();
      if (error) { console.error('[ProjectsStore] get failed:', error); return null; }
      if (!data) return null;
      const project = mapProject(data);
      project.timeline = await this.timeline(id);
      return project;
    },

    /** @param {string} requestId @returns {Promise<Object|null>} */
    async getByRequestId(requestId) {
      const { data, error } = await client().from('projects').select(SELECT_WITH_PACKAGE).eq('request_id', requestId).maybeSingle();
      if (error) { console.error('[ProjectsStore] getByRequestId failed:', error); return null; }
      return data ? mapProject(data) : null;
    },

    /** @param {string} requestId @returns {Promise<Object>} the new project */
    async convertFromRequest(requestId) {
      const { data, error } = await client().rpc('convert_request_to_project', { p_request_id: requestId });
      if (error) { console.error('[ProjectsStore] convertFromRequest failed:', error); throw error; }
      return mapProject(data);
    },

    /**
     * @param {string} id
     * @param {string} newStatus
     * @param {string} [note]
     * @returns {Promise<Object>}
     */
    async updateStatus(id, newStatus, note) {
      const { data, error } = await client().rpc('update_project_status', { p_project_id: id, p_new_status: newStatus, p_note: note || null });
      if (error) { console.error('[ProjectsStore] updateStatus failed:', error); throw error; }
      return mapProject(data);
    },

    /** @param {string} projectId @returns {Promise<Array>} */
    async timeline(projectId) {
      const { data, error } = await client().from('project_timeline_events').select('*').eq('project_id', projectId).order('at', { ascending: false });
      if (error) { console.error('[ProjectsStore] timeline failed:', error); return []; }
      return data.map(mapTimelineEvent);
    },

  };

})();

if (typeof window !== 'undefined') window.ProjectsStore = ProjectsStore;
if (typeof module !== 'undefined') module.exports = ProjectsStore;
