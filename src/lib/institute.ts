/**
 * DruptoLMS institute / plan data access (client-safe reads).
 *
 * Plans and institutes are tenant-critical documents. Client code may READ
 * published plans and the caller's own institute here, but all WRITES
 * (creating institutes, updating subscriptions, staff management) go through
 * Cloud Functions / the super admin path.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { slugify } from "@/lib/utils";
import type { Institute, InstituteMember, Plan } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

export async function getPublishedPlans(): Promise<Plan[]> {
  const ref = collection(db, "plans");
  const q = query(
    ref,
    where("published", "==", true),
    orderBy("priceInr", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Plan);
}

export async function getAllPlans(): Promise<Plan[]> {
  const ref = collection(db, "plans");
  const q = query(ref, orderBy("priceInr", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Plan);
}

export async function getPlanById(planId: string): Promise<Plan | null> {
  const ref = doc(db, "plans", planId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Plan) : null;
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const q = query(
    collection(db, "plans"),
    where("slug", "==", slugify(slug))
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Plan);
}

/* -------------------------------------------------------------------------- */
/* Institutes                                                                 */
/* -------------------------------------------------------------------------- */

export async function getInstituteById(instituteId: string): Promise<Institute | null> {
  const ref = doc(db, "institutes", instituteId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Institute) : null;
}

export async function getInstituteBySlug(slug: string): Promise<Institute | null> {
  const q = query(
    collection(db, "institutes"),
    where("slug", "==", slugify(slug))
  );
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Institute);
}

export async function getInstituteByOwner(ownerUid: string): Promise<Institute | null> {
  const q = query(collection(db, "institutes"), where("ownerUid", "==", ownerUid));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Institute);
}

export async function getInstitutes(): Promise<Institute[]> {
  const q = query(collection(db, "institutes"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Institute);
}

/** True when an institute's subscription allows selling / creating courses. */
export function isInstituteActive(institute: Institute | null | undefined): boolean {
  return institute?.subscriptionStatus === "active";
}

/* -------------------------------------------------------------------------- */
/* Members                                                                    */
/* -------------------------------------------------------------------------- */

export async function getInstituteMembers(instituteId: string): Promise<InstituteMember[]> {
  const q = query(
    collection(db, "institutes", instituteId, "members"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...d.data(), uid: d.id, instituteId }) as InstituteMember);
}

export async function getInstituteMember(
  instituteId: string,
  uid: string
): Promise<InstituteMember | null> {
  const ref = doc(db, "institutes", instituteId, "members", uid);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? ({ ...snapshot.data(), uid, instituteId } as InstituteMember) : null;
}