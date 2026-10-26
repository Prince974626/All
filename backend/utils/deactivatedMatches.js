import DeactivatedMatch from '../models/matchSettingsModel.js';
import SubAdmin from '../models/subAdminModel.js';

/**
 * Admin IDs whose Match Control hides apply to this viewer.
 * - Superadmin hides are site-wide (including guests / demo with no invite).
 * - Other admins' hides apply only when they are on the viewer's upline.
 */
export async function getApplicableDeactivatorIds(viewerId) {
  const ids = new Set();

  const supers = await SubAdmin.find(
    { role: { $in: ['supperadmin', 'superadmin'] } },
    { _id: 1 }
  ).lean();
  for (const s of supers) {
    if (s?._id) ids.add(String(s._id));
  }

  if (!viewerId) return ids;

  const viewer = await SubAdmin.findById(viewerId)
    .select('invite code role')
    .lean();
  if (!viewer) return ids;

  let walk = viewer;
  for (let i = 0; i < 20 && walk?.invite; i++) {
    const parent = await SubAdmin.findOne(
      { code: walk.invite },
      { _id: 1, invite: 1, code: 1, role: 1 }
    ).lean();
    if (!parent) break;
    if (parent._id) ids.add(String(parent._id));
    walk = parent;
  }

  return ids;
}

/**
 * Match/tournament ids hidden for this viewer (by upline / superadmin).
 * Legacy rows without deactivateBy still apply to everyone.
 */
export async function getDeactivatedIdSet(sport, viewerId = null) {
  const query = sport ? { sport } : {};
  const applicableIds = await getApplicableDeactivatorIds(viewerId);

  const rows = await DeactivatedMatch.find(query)
    .select('matchId deactivateBy')
    .lean();

  const set = new Set();
  for (const row of rows) {
    const mid = row?.matchId != null ? String(row.matchId) : '';
    if (!mid) continue;

    if (row.deactivateBy == null) {
      // Legacy global hide
      set.add(mid);
      continue;
    }

    if (applicableIds.has(String(row.deactivateBy))) {
      set.add(mid);
    }
  }
  return set;
}

/**
 * Drop matches whose id or tournament title is deactivated.
 */
export function excludeDeactivatedMatches(
  matches,
  deactivatedIds,
  { idKey = 'id', titleKey = 'title' } = {}
) {
  if (!deactivatedIds?.size) return matches;
  return matches.filter((match) => {
    const id = String(match?.[idKey] ?? '');
    const title = String(match?.[titleKey] ?? '');
    if (id && deactivatedIds.has(id)) return false;
    if (title && deactivatedIds.has(title)) return false;
    return true;
  });
}

export function shouldIncludeDeactivated(req) {
  const flag = String(req.query?.includeDeactivated || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

/** All user/admin ids under this admin's invite tree (for scoped WS). */
export async function collectDownlineIds(adminId) {
  const admin = await SubAdmin.findById(adminId).select('code role').lean();
  if (!admin?.code) return [];

  const role = String(admin.role || '').toLowerCase();
  if (role === 'supperadmin' || role === 'superadmin') {
    return null; // null = broadcast to everyone
  }

  const result = [];
  const seen = new Set();
  let frontier = [admin.code];

  for (let depth = 0; depth < 20 && frontier.length; depth++) {
    const children = await SubAdmin.find(
      { invite: { $in: frontier } },
      { _id: 1, code: 1 }
    ).lean();
    frontier = [];
    for (const child of children) {
      const id = String(child._id);
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
      if (child.code) frontier.push(child.code);
    }
  }

  return result;
}
