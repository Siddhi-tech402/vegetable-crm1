import Farmer from '@/models/Farmer';

interface SessionLikeUser {
  id?: string;
  email?: string | null;
  name?: string | null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve farmer profile for a logged-in farmer user.
 * Priority: userId → email → exact name → partial name → auto-create
 */
export async function resolveFarmerForSessionUser(user: SessionLikeUser) {
  if (!user?.id) {
    return null;
  }

  // 1. Already linked by userId (fastest path)
  const byUserId = await Farmer.findOne({ userId: user.id });
  if (byUserId) {
    return byUserId;
  }

  // 2. Match by email (also links userId for future lookups)
  if (user.email) {
    const byEmail = await Farmer.findOne({ email: user.email.toLowerCase() });
    if (byEmail) {
      byEmail.userId = user.id as any;
      await byEmail.save();
      return byEmail;
    }
  }

  // 3. Match by exact name (case-insensitive)
  if (user.name?.trim()) {
    const exactNameRegex = new RegExp(`^${escapeRegExp(user.name.trim())}$`, 'i');
    const candidates = await Farmer.find({ name: exactNameRegex });
    if (candidates.length > 0) {
      // Link userId so future lookups are faster
      if (!candidates[0].userId) {
        candidates[0].userId = user.id as any;
        await candidates[0].save();
      }
      return candidates[0];
    }

    // 4. Partial name match — e.g. "hareshbhai" matches "Haresh Bhai Patel"
    const partialNameRegex = new RegExp(escapeRegExp(user.name.trim()), 'i');
    const partialCandidates = await Farmer.find({ name: partialNameRegex });
    if (partialCandidates.length > 0) {
      if (!partialCandidates[0].userId) {
        partialCandidates[0].userId = user.id as any;
        await partialCandidates[0].save();
      }
      return partialCandidates[0];
    }
  }

  // 5. Auto-create a new farmer profile so the dashboard works
  try {
    const lastFarmer = await Farmer.findOne({}).sort({ code: -1 }).select('code');
    const lastNum = lastFarmer?.code ? parseInt(lastFarmer.code.replace('F', '')) : 0;
    const newCode = `F${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(4, '0')}`;

    console.log('[farmerResolver] Auto-creating farmer profile for:', user);
    const newFarmer = await Farmer.create({
      code: newCode,
      userId: user.id as any,
      name: user.name || 'Unknown',
      email: user.email || undefined,
      phone: '0000000000',
      address: 'Not Provided',
      createdBy: user.id as any,
      isActive: true,
      syncStatus: 'synced',
    });
    return newFarmer;
  } catch (error) {
    console.error('[farmerResolver] Failed to auto-create farmer profile:', error);
    return null;
  }
}
