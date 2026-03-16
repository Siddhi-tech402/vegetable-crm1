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
 * Fallbacks are used for legacy data where userId was not linked yet.
 */
export async function resolveFarmerForSessionUser(user: SessionLikeUser) {
  if (!user?.id) {
    return null;
  }

  const existingLinkedFarmer = await Farmer.findOne({ userId: user.id });
  if (existingLinkedFarmer) {
    return existingLinkedFarmer;
  }

  if (user.email) {
    const byEmail = await Farmer.findOne({ email: user.email.toLowerCase() });
    if (byEmail) {
      byEmail.userId = user.id as any;
      await byEmail.save();
      return byEmail;
    }
  }

  if (user.name?.trim()) {
    const exactName = new RegExp(`^${escapeRegExp(user.name.trim())}$`, 'i');
    const candidates = await Farmer.find({ name: exactName }).limit(2);
    if (candidates.length === 1) {
      candidates[0].userId = user.id as any;
      await candidates[0].save();
      return candidates[0];
    }
  }

  return null;
}
