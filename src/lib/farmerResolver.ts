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
    const candidates = await Farmer.find({ name: exactName });
    if (candidates.length > 0) {
      if (!candidates[0].userId) {
        candidates[0].userId = user.id as any;
        await candidates[0].save();
      }
      return candidates[0];
    }
  }

  // If no existing farmer profile is found, auto-create one so the dashboard works
  try {
    const lastFarmer = await Farmer.findOne({})
      .sort({ code: -1 })
      .select('code');
    const lastNum = lastFarmer && lastFarmer.code ? parseInt(lastFarmer.code.replace('F', '')) : 0;
    const newCode = `F${String((isNaN(lastNum) ? 0 : lastNum) + 1).padStart(4, '0')}`;

    console.log('Generating new Farmer profile for session user:', user);
    const newFarmer = await Farmer.create({
      code: newCode,
      userId: user.id as any,
      name: user.name || 'Unknown',
      email: user.email || undefined,
      phone: '0000000000', // Default placeholder, user can update profile later
      address: 'Not Provided',
      createdBy: user.id as any,
      isActive: true,
      syncStatus: 'synced'
    });
    return newFarmer;
  } catch (error) {
    console.error('Failed to auto-create farmer profile:', error);
    return null;
  }
}
