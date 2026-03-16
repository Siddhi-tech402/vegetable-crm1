import mongoose from 'mongoose';

/**
 * Build a MongoDB query filter that handles both ObjectId and localId lookups.
 * The sync service sends localId (e.g. "local_177193...") while direct API calls
 * send MongoDB ObjectId strings.
 */
export function buildIdQuery(id: string, createdBy?: string): Record<string, any> {
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);

  const query: Record<string, any> = isObjectId
    ? { $or: [{ _id: id }, { localId: id }] }
    : { localId: id };

  if (createdBy) {
    query.createdBy = createdBy;
  }

  return query;
}
