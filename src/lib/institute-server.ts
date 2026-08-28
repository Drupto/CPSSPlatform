import { adminDb } from "@/lib/firebase-admin";
import type { Institute } from "@/lib/types";

/**
 * Server-side institute lookups (Node runtime). Used by the `/institute`
 * layout / shell to render the tenant's branding and status from the session
 * cookie's `instituteId` claim.
 */
export async function getInstituteByIdServer(instituteId: string): Promise<Institute | null> {
  try {
    const snap = await adminDb.doc(`institutes/${instituteId}`).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Institute) : null;
  } catch (err) {
    console.error("[getInstituteByIdServer] failed:", err);
    return null;
  }
}

export async function getInstituteByOwnerServerless(ownerUid: string): Promise<Institute | null> {
  try {
    const snap = await adminDb
      .collection("institutes")
      .where("ownerUid", "==", ownerUid)
      .limit(1)
      .get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Institute);
  } catch (err) {
    console.error("[getInstituteByOwnerServerless] failed:", err);
    return null;
  }
}