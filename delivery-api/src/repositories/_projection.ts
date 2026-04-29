/**
 * Projection string passed to Mongoose find/findOne calls so the wire
 * payload omits internal fields (_id, version key) and matches the
 * frontend's `id`-first contract.
 */
export const HIDE_INTERNALS = '-_id -__v';
