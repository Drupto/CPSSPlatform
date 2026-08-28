"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInstituteDelete = exports.expireInstitutes = exports.reconcilePendingOrders = exports.syncUserClaims = exports.revokeEnrollment = exports.refundOrder = exports.verifyPayment = exports.handleRazorpayWebhook = exports.createCheckout = void 0;
/**
 * DruptoLMS — Payment Cloud Functions (Razorpay).
 *
 * Owns the complete purchase lifecycle:
 * - `createCheckout`     : validates + creates a Razorpay Order + a pending `orders` doc
 * - `handleRazorpayWebhook`: verifies signature over the raw body -> idempotent grant
 * - `verifyPayment`       : client-side fallback when the webhook is delayed
 * - `refundOrder` / `revokeEnrollment`: admin refunds and access revocation
 * - `reconcilePendingOrders` / `expireInstitutes`: scheduled maintenance
 *
 * Orders live in `orders/{id}` (the ledger). They are created/updated ONLY from
 * these functions (Firestore rules deny all client writes — mirrors `quizAttempts`).
 */
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const firestore_2 = require("firebase-admin/firestore");
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const PAYMENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
/** Pending orders older than this are eligible for reconciliation. */
const ORDER_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours
/** Grace period after plan expiry before an institute becomes "expired". */
const INSTITUTE_GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
function assertValidId(value, field) {
    if (typeof value !== "string" || !ID_RE.test(value)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid ${field}`);
    }
}
function assertPaymentId(value) {
    if (typeof value !== "string" || !PAYMENT_ID_RE.test(value)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid paymentId");
    }
}
/* -------------------------------------------------------------------------- */
/* Gateway config                                                              */
/* -------------------------------------------------------------------------- */
function getRazorpay() {
    var _a, _b;
    const keyId = (_a = process.env.RAZORPAY_KEY_ID) !== null && _a !== void 0 ? _a : "";
    const keySecret = (_b = process.env.RAZORPAY_KEY_SECRET) !== null && _b !== void 0 ? _b : "";
    if (!keyId || !keySecret) {
        throw new https_1.HttpsError("failed-precondition", "Payment gateway is not configured");
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
function getRazorpayKeyId() {
    var _a;
    return (_a = process.env.RAZORPAY_KEY_ID) !== null && _a !== void 0 ? _a : "";
}
/* -------------------------------------------------------------------------- */
/* Money split (paise)                                                         */
/* -------------------------------------------------------------------------- */
function computeSplit(amountPaise, commissionPct) {
    const safe = Math.min(100, Math.max(0, commissionPct));
    const commission = Math.round((amountPaise * safe) / 100);
    return { commission, instituteShare: amountPaise - commission };
}
/* -------------------------------------------------------------------------- */
/* Authorization helpers                                                       */
/* -------------------------------------------------------------------------- */
async function isSuperUser(db, uid) {
    var _a;
    const snap = await db.doc(`users/${uid}`).get();
    return snap.exists && ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.role) === "super";
}
/** Owner or active staff member of the institute. */
async function canManageInstitute(db, uid, instituteId) {
    var _a;
    if (!instituteId)
        return false;
    const instSnap = await db.doc(`institutes/${instituteId}`).get();
    if (instSnap.exists && ((_a = instSnap.data()) === null || _a === void 0 ? void 0 : _a.ownerUid) === uid)
        return true;
    const memberSnap = await db.doc(`institutes/${instituteId}/members/${uid}`).get();
    if (!memberSnap.exists)
        return false;
    const member = memberSnap.data();
    return (member === null || member === void 0 ? void 0 : member.status) === "active" && (member.role === "admin" || member.role === "staff");
}
/** Course must still be published and (if tenant-owned) the institute still active. */
async function assertCoursePurchasableNow(db, order) {
    const courseSnap = await db.doc(`courses/${order.courseId}`).get();
    if (!courseSnap.exists) {
        throw new https_1.HttpsError("failed-precondition", "Course is no longer available");
    }
    const course = courseSnap.data();
    if ((course === null || course === void 0 ? void 0 : course.published) !== true) {
        throw new https_1.HttpsError("failed-precondition", "Course is no longer available for purchase");
    }
    if (course === null || course === void 0 ? void 0 : course.instituteId) {
        const instSnap = await db.doc(`institutes/${course.instituteId}`).get();
        const inst = instSnap.data();
        if (!inst || inst.subscriptionStatus !== "active") {
            throw new https_1.HttpsError("failed-precondition", "The institute selling this course is not active");
        }
    }
}
/* -------------------------------------------------------------------------- */
/* Order lookup                                                                */
/* -------------------------------------------------------------------------- */
async function findOrderByGatewayRef(db, gatewayId) {
    const snap = await db
        .collection("orders")
        .where("gatewayRef", "==", gatewayId)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    const doc = snap.docs[0];
    const data = Object.assign(Object.assign({}, doc.data()), { id: doc.id });
    return { id: doc.id, data };
}
/* -------------------------------------------------------------------------- */
/* Idempotent grant                                                            */
/* -------------------------------------------------------------------------- */
/**
 * Marks an order `paid` and performs the associated grant in ONE transaction.
 * Because the status guard is (`pending -> paid` only) and enrollment IDs are
 * deterministic (`{buyerId}_{courseId}`), concurrent webhook + verifyPayment
 * calls can never double-grant or double-create enrollments.
 */
async function grantPaidOrder(db, orderId, paymentId) {
    let granted;
    try {
        granted = await db.runTransaction(async (tx) => {
            var _a, _b, _c, _d, _e, _f;
            const orderRef = db.doc(`orders/${orderId}`);
            const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists) {
                throw new https_1.HttpsError("not-found", "Order not found");
            }
            const order = Object.assign({ id: orderSnap.id }, orderSnap.data());
            if (order.status === "paid") {
                return order; // already granted (idempotent)
            }
            if (order.status !== "pending") {
                throw new https_1.HttpsError("failed-precondition", `Order is not payable (status: ${order.status})`);
            }
            const now = firestore_2.Timestamp.now();
            tx.update(orderRef, {
                status: "paid",
                paymentId,
                paidAt: now,
                updatedAt: now,
            });
            if (order.type === "course") {
                const buyerSnap = await tx.get(db.doc(`users/${order.buyerId}`));
                const buyer = buyerSnap.exists ? buyerSnap.data() : undefined;
                tx.set(db.doc(`enrollments/${order.buyerId}_${order.courseId}`), {
                    id: `${order.buyerId}_${order.courseId}`,
                    userId: order.buyerId,
                    courseId: order.courseId,
                    status: "approved",
                    source: "order",
                    orderId,
                    requestedAt: (_a = order.createdAt) !== null && _a !== void 0 ? _a : now,
                    enrolledAt: now,
                    // Denormalized buyer info so the institute can display students
                    // without reading other users' profiles (blocked by rules).
                    studentName: (_b = buyer === null || buyer === void 0 ? void 0 : buyer.displayName) !== null && _b !== void 0 ? _b : "",
                    studentEmail: (_c = buyer === null || buyer === void 0 ? void 0 : buyer.email) !== null && _c !== void 0 ? _c : "",
                }, { merge: true });
            }
            else if (order.type === "plan" && order.instituteId) {
                const [planSnap, instSnap] = await Promise.all([
                    tx.get(db.doc(`plans/${order.planId}`)),
                    tx.get(db.doc(`institutes/${order.instituteId}`)),
                ]);
                const plan = planSnap.exists ? planSnap.data() : undefined;
                const instData = instSnap.exists
                    ? instSnap.data()
                    : undefined;
                const base = (instData === null || instData === void 0 ? void 0 : instData.planExpiresAt) ? new Date(instData.planExpiresAt.toMillis()) : new Date();
                if (base.getTime() <= Date.now())
                    base.setTime(Date.now());
                base.setMonth(base.getMonth() + ((_d = order.planPeriodMonths) !== null && _d !== void 0 ? _d : 1));
                tx.update(db.doc(`institutes/${order.instituteId}`), {
                    subscriptionStatus: "active",
                    planId: order.planId,
                    planExpiresAt: firestore_2.Timestamp.fromDate(base),
                    activeOrderId: orderId,
                    limits: (_e = plan === null || plan === void 0 ? void 0 : plan.limits) !== null && _e !== void 0 ? _e : {},
                    commissionPct: Number((_f = plan === null || plan === void 0 ? void 0 : plan.commissionPct) !== null && _f !== void 0 ? _f : 0),
                    updatedAt: now,
                });
                tx.set(db.doc(`users/${order.buyerId}`), { role: "institute", instituteId: order.instituteId, updatedAt: now }, { merge: true });
            }
            return order;
        });
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        console.error(`[grantPaidOrder] Failed for ${orderId}:`, err);
        throw new https_1.HttpsError("internal", "Failed to grant the order");
    }
    // Custom claims are set OUTSIDE the Firestore transaction (Auth API).
    if (granted.type === "plan" && granted.instituteId) {
        try {
            await admin.auth().setCustomUserClaims(granted.buyerId, {
                role: "institute",
                instituteId: granted.instituteId,
            });
        }
        catch (err) {
            console.error("[grantPaidOrder] Failed to set custom claims:", err);
        }
    }
    return granted;
}
async function createCourseCheckout(db, uid, courseId) {
    var _a, _b, _c, _d;
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) {
        throw new https_1.HttpsError("not-found", "Course not found");
    }
    const course = courseSnap.data();
    if ((course === null || course === void 0 ? void 0 : course.published) !== true) {
        throw new https_1.HttpsError("failed-precondition", "This course is not available for purchase");
    }
    let commissionPct = 100; // platform-owned courses: 100% platform
    const instituteId = course.instituteId;
    if (instituteId) {
        const instSnap = await db.doc(`institutes/${instituteId}`).get();
        const inst = instSnap.data();
        if (!inst || inst.subscriptionStatus !== "active") {
            throw new https_1.HttpsError("failed-precondition", "The institute selling this course is not active");
        }
        const buyerSnap = await db.doc(`users/${uid}`).get();
        if (((_a = buyerSnap.data()) === null || _a === void 0 ? void 0 : _a.instituteId) === instituteId) {
            throw new https_1.HttpsError("permission-denied", "Institute members cannot purchase their own course");
        }
        commissionPct = Number((_b = inst.commissionPct) !== null && _b !== void 0 ? _b : 0);
    }
    const price = Number(course.price) || 0;
    if (price < 0) {
        throw new https_1.HttpsError("invalid-argument", "Invalid course price");
    }
    const amountPaise = Math.round(price * 100);
    // Duplicate / in-flight guard: only ONE pending or paid course order per buyer.
    const snapshot = await db
        .collection("orders")
        .where("buyerId", "==", uid)
        .where("courseId", "==", courseId)
        .limit(10)
        .get();
    const blocking = snapshot.docs
        .map((d) => (Object.assign({ id: d.id }, d.data())))
        .find((o) => o.status === "pending" || o.status === "paid");
    if (blocking) {
        if (blocking.status === "paid") {
            throw new https_1.HttpsError("already-exists", "You are already enrolled in this course");
        }
        return {
            orderDocId: blocking.id,
            type: "course",
            status: "pending",
            requiresPayment: true,
            razorpayOrderId: blocking.gatewayRef,
            razorpayKeyId: blocking.gatewayRef ? getRazorpayKeyId() : undefined,
            amountPaise: blocking.amount,
            currency: "INR",
            courseId,
            instituteId: blocking.instituteId,
        };
    }
    const now = firestore_2.Timestamp.now();
    const split = computeSplit(amountPaise, commissionPct);
    const orderRef = db.collection("orders").doc();
    const orderDocId = orderRef.id;
    const buyerSnap = await db.doc(`users/${uid}`).get();
    const buyer = buyerSnap.exists ? buyerSnap.data() : undefined;
    await orderRef.set({
        id: orderDocId,
        type: "course",
        buyerId: uid,
        buyerName: (_c = buyer === null || buyer === void 0 ? void 0 : buyer.displayName) !== null && _c !== void 0 ? _c : "",
        buyerEmail: (_d = buyer === null || buyer === void 0 ? void 0 : buyer.email) !== null && _d !== void 0 ? _d : "",
        instituteId: instituteId !== null && instituteId !== void 0 ? instituteId : undefined,
        courseId,
        amount: amountPaise,
        commissionPct,
        commission: split.commission,
        instituteShare: split.instituteShare,
        currency: "INR",
        status: "pending",
        createdAt: now,
        updatedAt: now,
    });
    // Free courses skip the gateway entirely and are granted immediately.
    if (amountPaise === 0) {
        await grantPaidOrder(db, orderDocId, `free_${orderDocId}`);
        return {
            orderDocId,
            type: "course",
            status: "paid",
            requiresPayment: false,
            amountPaise: 0,
            currency: "INR",
            courseId,
            instituteId,
        };
    }
    const rzp = getRazorpay();
    const rzpOrder = await rzp.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `c_${orderDocId}`.slice(0, 40),
        notes: { orderDocId, type: "course" },
    });
    await orderRef.update({ gatewayRef: rzpOrder.id, updatedAt: firestore_2.Timestamp.now() });
    return {
        orderDocId,
        type: "course",
        status: "pending",
        requiresPayment: true,
        razorpayOrderId: rzpOrder.id,
        razorpayKeyId: getRazorpayKeyId(),
        amountPaise,
        currency: "INR",
        courseId,
        instituteId,
    };
}
async function createPlanCheckout(db, uid, planId) {
    const planSnap = await db.doc(`plans/${planId}`).get();
    if (!planSnap.exists) {
        throw new https_1.HttpsError("not-found", "Plan not found");
    }
    const plan = planSnap.data();
    if ((plan === null || plan === void 0 ? void 0 : plan.published) !== true) {
        throw new https_1.HttpsError("failed-precondition", "This plan is not available");
    }
    const now = firestore_2.Timestamp.now();
    // Reuse the buyer's existing institute (any status) or create a pending one.
    let instituteId = null;
    const existingInsts = await db.collection("institutes").where("ownerUid", "==", uid).limit(1).get();
    if (!existingInsts.empty) {
        instituteId = existingInsts.docs[0].id;
    }
    else {
        const newInstRef = db.collection("institutes").doc();
        instituteId = newInstRef.id;
        await newInstRef.set({
            id: instituteId,
            slug: `inst_${instituteId}`,
            name: "My Institute",
            ownerUid: uid,
            planId,
            subscriptionStatus: "pending",
            createdAt: now,
            updatedAt: now,
        });
    }
    // Duplicate / in-flight guard for plan purchases.
    const inFlight = await db
        .collection("orders")
        .where("buyerId", "==", uid)
        .where("type", "==", "plan")
        .limit(10)
        .get();
    const blocking = inFlight.docs
        .map((d) => (Object.assign({ id: d.id }, d.data())))
        .find((o) => o.status === "pending" || o.status === "paid");
    if (blocking) {
        if (blocking.status === "paid") {
            throw new https_1.HttpsError("already-exists", "You already have an active subscription");
        }
        return {
            orderDocId: blocking.id,
            type: "plan",
            status: "pending",
            requiresPayment: true,
            razorpayOrderId: blocking.gatewayRef,
            razorpayKeyId: blocking.gatewayRef ? getRazorpayKeyId() : undefined,
            amountPaise: blocking.amount,
            currency: "INR",
            planId,
            instituteId: blocking.instituteId,
        };
    }
    const priceInr = Number(plan.priceInr) || 0;
    const amountPaise = Math.round(priceInr * 100);
    const planPeriodMonths = plan.period === "annual" ? 12 : 1;
    // Plan purchases are 100% platform revenue (no institute share).
    const orderRef = db.collection("orders").doc();
    const orderDocId = orderRef.id;
    await orderRef.set({
        id: orderDocId,
        type: "plan",
        buyerId: uid,
        instituteId,
        planId,
        amount: amountPaise,
        commissionPct: 100,
        commission: amountPaise,
        instituteShare: 0,
        currency: "INR",
        status: "pending",
        planPeriodMonths,
        createdAt: now,
        updatedAt: now,
    });
    const rzp = getRazorpay();
    const rzpOrder = await rzp.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `p_${orderDocId}`.slice(0, 40),
        notes: { orderDocId, type: "plan" },
    });
    await orderRef.update({ gatewayRef: rzpOrder.id, updatedAt: firestore_2.Timestamp.now() });
    return {
        orderDocId,
        type: "plan",
        status: "pending",
        requiresPayment: true,
        razorpayOrderId: rzpOrder.id,
        razorpayKeyId: getRazorpayKeyId(),
        amountPaise,
        currency: "INR",
        planId,
        instituteId,
    };
}
exports.createCheckout = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = (_b = request.data) !== null && _b !== void 0 ? _b : {};
    if (data.type === "course") {
        assertValidId(data.courseId, "courseId");
        return createCourseCheckout(admin.firestore(), uid, data.courseId);
    }
    if (data.type === "plan") {
        assertValidId(data.planId, "planId");
        return createPlanCheckout(admin.firestore(), uid, data.planId);
    }
    throw new https_1.HttpsError("invalid-argument", "type must be 'course' or 'plan'");
});
/* -------------------------------------------------------------------------- */
/* Webhook — events from Razorpay                                             */
/* -------------------------------------------------------------------------- */
function logRejectedEvent(db, event, gatewayId, payload, reason) {
    return db.collection("rejectedEvents").add({
        event,
        gatewayId,
        reason,
        payload,
        at: firestore_2.Timestamp.now(),
    });
}
exports.handleRazorpayWebhook = (0, https_2.onRequest)({ region: "us-central1" }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const secret = (_a = process.env.RAZORPAY_KEY_SECRET) !== null && _a !== void 0 ? _a : "";
    if (!secret) {
        res.status(500).json({ error: "Webhook not configured" });
        return;
    }
    const headerSignature = req.headers["x-razorpay-signature"];
    const rawBody = (_c = (_b = req.rawBody) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : "";
    if (typeof headerSignature !== "string" ||
        !Razorpay.validateWebhookSignature(rawBody, headerSignature, secret)) {
        res.status(400).json({ error: "Invalid signature" });
        return;
    }
    let payload;
    try {
        payload = JSON.parse(rawBody);
    }
    catch (_j) {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
    }
    const event = String((_d = payload.event) !== null && _d !== void 0 ? _d : "");
    const entity = ((_g = (_f = (_e = payload.payload) === null || _e === void 0 ? void 0 : _e.payment) === null || _f === void 0 ? void 0 : _f.entity) !== null && _g !== void 0 ? _g : payload.entity);
    const gatewayId = entity === null || entity === void 0 ? void 0 : entity.order_id;
    if (!gatewayId) {
        // Not a payment event we care about — acknowledge to stop retries.
        res.status(200).json({ received: true, event });
        return;
    }
    const db = admin.firestore();
    try {
        if (event === "payment.captured") {
            const hit = await findOrderByGatewayRef(db, gatewayId);
            if (!hit) {
                await logRejectedEvent(db, event, gatewayId, payload, "unmatched order");
                res.status(200).json({ received: true, status: "unmatched" });
                return;
            }
            const capturedAmount = Number(entity === null || entity === void 0 ? void 0 : entity.amount) || 0;
            if (capturedAmount !== hit.data.amount) {
                await logRejectedEvent(db, event, gatewayId, payload, `amount mismatch expected=${hit.data.amount} got=${capturedAmount}`);
                res.status(200).json({ received: true, status: "amount-mismatch" });
                return;
            }
            try {
                if (hit.data.type === "course") {
                    await assertCoursePurchasableNow(db, hit.data);
                }
                const granted = await grantPaidOrder(db, hit.id, String((_h = entity === null || entity === void 0 ? void 0 : entity.id) !== null && _h !== void 0 ? _h : ""));
                res.status(200).json({ received: true, status: "granted", orderDocId: hit.id, type: granted.type });
            }
            catch (err) {
                if (err instanceof https_1.HttpsError) {
                    // Deterministic business rule (e.g. course unpublished) — unsure refundable
                    await logRejectedEvent(db, event, gatewayId, payload, err.message);
                    res.status(200).json({ received: true, status: "rejected" });
                }
                else {
                    throw err; // transient — let Razorpay retry
                }
            }
        }
        else if (event === "payment.failed") {
            const hit = await findOrderByGatewayRef(db, gatewayId);
            if (hit && hit.data.status === "pending") {
                await db.doc(`orders/${hit.id}`).update({ status: "failed", updatedAt: firestore_2.Timestamp.now() });
            }
            res.status(200).json({ received: true, status: "failed" });
        }
        else {
            res.status(200).json({ received: true, event });
        }
    }
    catch (err) {
        console.error("[handleRazorpayWebhook]", err);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});
/* -------------------------------------------------------------------------- */
/* verifyPayment — client-side fallback for the checkout success redirect     */
/* -------------------------------------------------------------------------- */
exports.verifyPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = (_b = request.data) !== null && _b !== void 0 ? _b : {};
    assertValidId(data.orderDocId, "orderDocId");
    assertPaymentId(data.razorpayPaymentId);
    const db = admin.firestore();
    const orderSnap = await db.doc(`orders/${data.orderDocId}`).get();
    if (!orderSnap.exists) {
        throw new https_1.HttpsError("not-found", "Order not found");
    }
    const order = Object.assign({ id: orderSnap.id }, orderSnap.data());
    if (order.buyerId !== uid) {
        throw new https_1.HttpsError("permission-denied", "You cannot verify this order");
    }
    if (order.status === "paid") {
        return { success: true, orderDocId: order.id, paymentId: (_c = order.paymentId) !== null && _c !== void 0 ? _c : data.razorpayPaymentId };
    }
    if (order.status !== "pending") {
        throw new https_1.HttpsError("failed-precondition", "This order is not payable");
    }
    const secret = (_d = process.env.RAZORPAY_KEY_SECRET) !== null && _d !== void 0 ? _d : "";
    const gatewayRef = order.gatewayRef;
    if (!gatewayRef || !secret) {
        throw new https_1.HttpsError("failed-precondition", "Payment cannot be verified");
    }
    // Checkout success signature: HMAC-SHA256(secret, `${orderId}|${paymentId}`)
    const signatureValid = Razorpay.validateWebhookSignature(`${gatewayRef}|${data.razorpayPaymentId}`, data.razorpaySignature, secret);
    if (!signatureValid) {
        throw new https_1.HttpsError("unauthenticated", "Payment signature is invalid");
    }
    const rzp = getRazorpay();
    const payment = await rzp.payments.fetch(data.razorpayPaymentId);
    if (payment.order_id !== gatewayRef ||
        payment.status !== "captured" ||
        Number(payment.amount) !== order.amount) {
        throw new https_1.HttpsError("failed-precondition", "Payment verification failed");
    }
    if (order.type === "course") {
        await assertCoursePurchasableNow(db, order);
    }
    await grantPaidOrder(db, order.id, data.razorpayPaymentId);
    return { success: true, orderDocId: order.id, paymentId: data.razorpayPaymentId };
});
exports.refundOrder = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = (_b = request.data) !== null && _b !== void 0 ? _b : {};
    assertValidId(data.orderDocId, "orderDocId");
    const db = admin.firestore();
    const orderRef = db.doc(`orders/${data.orderDocId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        throw new https_1.HttpsError("not-found", "Order not found");
    }
    const order = Object.assign({ id: orderSnap.id }, orderSnap.data());
    if (order.status !== "paid") {
        throw new https_1.HttpsError("failed-precondition", "Only paid orders can be refunded");
    }
    if (order.refund) {
        throw new https_1.HttpsError("already-exists", "This order has already been refunded");
    }
    if (!order.paymentId) {
        throw new https_1.HttpsError("failed-precondition", "Order has no payment reference");
    }
    // Authorization: plan refunds are super-only; course refunds are super or institute admin.
    if (order.type === "plan") {
        if (!(await isSuperUser(db, uid))) {
            throw new https_1.HttpsError("permission-denied", "Only the platform owner can refund plan purchases");
        }
    }
    else {
        const courseSnap = await db.doc(`courses/${order.courseId}`).get();
        const course = courseSnap.exists
            ? courseSnap.data()
            : undefined;
        const allowed = (await isSuperUser(db, uid)) || (await canManageInstitute(db, uid, course === null || course === void 0 ? void 0 : course.instituteId));
        if (!allowed) {
            throw new https_1.HttpsError("permission-denied", "You cannot refund this order");
        }
    }
    const refundAmount = data.full || !data.amountPaise ? order.amount : Math.min(Math.max(1, Math.round(data.amountPaise)), order.amount);
    const rzp = getRazorpay();
    const refund = await rzp.payments.refund(order.paymentId, { amount: refundAmount });
    const fullRefund = refundAmount >= order.amount;
    const now = firestore_2.Timestamp.now();
    await orderRef.update({
        status: fullRefund ? "refunded" : "paid",
        refund: { id: refund.id, amount: refundAmount, full: fullRefund, at: now },
        updatedAt: now,
    });
    // Full refund of a course revokes the student's access.
    if (fullRefund && order.type === "course" && order.courseId) {
        await db
            .doc(`enrollments/${order.buyerId}_${order.courseId}`)
            .update({ status: "revoked", revokedAt: now })
            .catch(() => console.warn(`[refundOrder] could not revoke enrollment for ${order.id}`));
    }
    return {
        refundId: refund.id,
        amountPaise: refundAmount,
        status: fullRefund ? "refunded" : "partial_refund",
    };
});
exports.revokeEnrollment = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to continue");
    }
    const data = (_b = request.data) !== null && _b !== void 0 ? _b : {};
    assertValidId(data.userId, "userId");
    assertValidId(data.courseId, "courseId");
    const db = admin.firestore();
    const courseSnap = await db.doc(`courses/${data.courseId}`).get();
    const course = courseSnap.exists
        ? courseSnap.data()
        : undefined;
    const allowed = (await isSuperUser(db, uid)) || (await canManageInstitute(db, uid, course === null || course === void 0 ? void 0 : course.instituteId));
    if (!allowed) {
        throw new https_1.HttpsError("permission-denied", "You cannot revoke this enrollment");
    }
    const now = firestore_2.Timestamp.now();
    await db
        .doc(`enrollments/${data.userId}_${data.courseId}`)
        .set({ status: "revoked", revokedAt: now }, { merge: true });
    return { success: true };
});
/* -------------------------------------------------------------------------- */
/* syncUserClaims — refresh custom claims after role changes                  */
/* -------------------------------------------------------------------------- */
exports.syncUserClaims = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Sign in to continue");
    const db = admin.firestore();
    const profileSnap = await db.doc(`users/${uid}`).get();
    const data = (_b = profileSnap.data()) !== null && _b !== void 0 ? _b : {};
    const claims = { role: (_c = data.role) !== null && _c !== void 0 ? _c : "student" };
    if (data.instituteId)
        claims.instituteId = data.instituteId;
    await admin.auth().setCustomUserClaims(uid, claims);
    return { success: true };
});
/* -------------------------------------------------------------------------- */
/* reconcilePendingOrders — scheduled maintenance                              */
/* -------------------------------------------------------------------------- */
async function reconcileStaleOrder(db, doc) {
    var _a;
    const order = Object.assign({ id: doc.id }, doc.data());
    if (order.status !== "pending")
        return;
    // If a Razorpay order exists, check whether it was actually paid.
    if (order.gatewayRef) {
        const rzp = getRazorpay();
        let paidPaymentId = null;
        try {
            const payments = await rzp.orders.fetchPayments(order.gatewayRef);
            const captured = ((_a = payments.items) !== null && _a !== void 0 ? _a : []).find((p) => p.status === "captured" && !!p.captured);
            if (captured)
                paidPaymentId = captured.id;
        }
        catch (err) {
            console.error(`[reconcilePendingOrders] gateway check failed for ${order.id}`, err);
            await db.doc(`orders/${order.id}`).update({ status: "failed", updatedAt: firestore_2.Timestamp.now() });
            return;
        }
        if (paidPaymentId) {
            await grantPaidOrder(db, order.id, paidPaymentId);
            return;
        }
    }
    // No paid payment -> mark failed so the buyer can start a fresh checkout.
    await db.doc(`orders/${order.id}`).update({ status: "failed", updatedAt: firestore_2.Timestamp.now() });
}
exports.reconcilePendingOrders = (0, scheduler_1.onSchedule)({ schedule: "5 * * * *", timeZone: "UTC" }, async () => {
    var _a, _b;
    const db = admin.firestore();
    const cutoff = firestore_2.Timestamp.fromMillis(Date.now() - ORDER_STALE_MS);
    const snapshot = await db
        .collection("orders")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .limit(50)
        .get();
    for (const doc of snapshot.docs) {
        const createdAtMs = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (createdAtMs !== undefined && createdAtMs > cutoff.toMillis())
            break;
        try {
            await reconcileStaleOrder(db, doc);
        }
        catch (err) {
            console.error(`[reconcilePendingOrders] order ${doc.id} failed`, err);
        }
    }
    console.info(`[reconcilePendingOrders] checked ${snapshot.docs.length} orders`);
});
/* -------------------------------------------------------------------------- */
/* expireInstitutes — scheduled lifecycle                                     */
/* -------------------------------------------------------------------------- */
exports.expireInstitutes = (0, scheduler_1.onSchedule)({ schedule: "0 2 * * *", timeZone: "UTC" }, async () => {
    var _a, _b;
    const db = admin.firestore();
    const now = Date.now();
    const snapshot = await db
        .collection("institutes")
        .where("subscriptionStatus", "==", "active")
        .get();
    let updated = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const expiresMs = (_b = (_a = data.planExpiresAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (!expiresMs || expiresMs > now)
            continue;
        const staleFor = now - expiresMs;
        const status = staleFor > INSTITUTE_GRACE_MS ? "expired" : "suspended";
        await doc.ref.update({ subscriptionStatus: status, updatedAt: firestore_2.Timestamp.now() });
        updated += 1;
        console.info(`[expireInstitutes] ${doc.id} -> ${status}`);
    }
    console.info(`[expireInstitutes] processed ${updated} institutes`);
});
/* -------------------------------------------------------------------------- */
/* onInstituteDelete — cascade to course archive                              */
/* -------------------------------------------------------------------------- */
exports.onInstituteDelete = (0, firestore_1.onDocumentDeleted)({
    document: "institutes/{instituteId}",
    retry: true,
}, async (event) => {
    const instituteId = event.params.instituteId;
    const db = admin.firestore();
    const courses = await db
        .collection("courses")
        .where("instituteId", "==", instituteId)
        .get();
    if (courses.empty)
        return;
    const batch = db.batch();
    const now = firestore_2.Timestamp.now();
    courses.docs.forEach((doc) => {
        batch.update(doc.ref, { archived: true, published: false, updatedAt: now });
    });
    await batch.commit();
    console.info(`[onInstituteDelete] archived ${courses.size} courses for ${instituteId}`);
});
//# sourceMappingURL=payments.js.map