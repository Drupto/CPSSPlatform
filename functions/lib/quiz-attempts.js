"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQuizAttempt = exports.startQuizAttempt = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const QUIZ_SUBMISSION_GRACE_MS = 5000;
/**
 * Strict ID validation regex — prevents Firestore path traversal.
 * Allows alphanumeric, underscore, and hyphen only (no slashes).
 */
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
/**
 * Session IDs are URL-encoded "userId:quizId" pairs. After encoding,
 * the colon becomes %3A, so the allowed charset is expanded to include
 * % and the encoded colon. We still reject slashes.
 */
const SESSION_ID_RE = /^[A-Za-z0-9_%-]{1,256}$/;
function assertValidId(value, fieldName) {
    if (typeof value !== "string" || !ID_RE.test(value)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid ${fieldName}`);
    }
}
function assertValidSessionId(value) {
    if (typeof value !== "string" || !SESSION_ID_RE.test(value)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid sessionId");
    }
}
function getQuizTimeLimitSeconds(quiz) {
    if (quiz.timeLimit === undefined || quiz.timeLimit === null) {
        return null;
    }
    return Math.max(0, Number(quiz.timeLimit)) * 60;
}
function getQuizScore(quiz, answers) {
    var _a;
    const questions = (_a = quiz.questions) !== null && _a !== void 0 ? _a : [];
    if (questions.length === 0) {
        // Rules require >= 1 question for new quizzes; this guards legacy docs so
        // we never write NaN (Firestore rejects NaN) or divide by zero.
        return 0;
    }
    let correctCount = 0;
    questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswerIndex) {
            correctCount++;
        }
    });
    return Math.round((correctCount / questions.length) * 100);
}
function validateAnswers(quiz, answers) {
    var _a;
    const questions = (_a = quiz.questions) !== null && _a !== void 0 ? _a : [];
    if (!Array.isArray(answers) || answers.length !== questions.length) {
        throw new Error("Invalid quiz answers");
    }
    answers.forEach((answer, index) => {
        var _a, _b;
        const optionsLength = (_b = (_a = questions[index].options) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        if (!Number.isInteger(answer) || (answer !== -1 && (answer < 0 || answer >= optionsLength))) {
            throw new Error("Invalid quiz answer selection");
        }
    });
}
function getSessionDocId(userId, quizId) {
    return encodeURIComponent(`${userId}:${quizId}`);
}
function assertEnrolled(enrollmentData, userId, courseId) {
    if (!enrollmentData || enrollmentData.userId !== userId || enrollmentData.courseId !== courseId) {
        throw new https_1.HttpsError("permission-denied", "User is not enrolled in this course");
    }
}
/**
 * Counts completed attempts for a specific user + course + quiz using a
 * composite query (backed by the composite index in firestore.indexes.json).
 * This avoids fetching all of a user's attempts across every course/quiz.
 */
async function countAttemptsForQuiz(transaction, db, userId, courseId, quizId) {
    const attemptsQuery = db
        .collection("quizAttempts")
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .where("quizId", "==", quizId);
    const attemptsSnap = await transaction.get(attemptsQuery);
    return attemptsSnap.size;
}
exports.startQuizAttempt = (0, https_1.onCall)(async (request) => {
    var _a;
    const { courseId, quizId } = request.data;
    if (!courseId || !quizId) {
        throw new https_1.HttpsError("invalid-argument", "Missing courseId or quizId");
    }
    // C1: Validate IDs to prevent Firestore path traversal
    assertValidId(courseId, "courseId");
    assertValidId(quizId, "quizId");
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError("unauthenticated", "Please sign in to start a quiz");
    }
    const db = admin.firestore();
    return db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d, _e, _f;
        const courseRef = db.doc(`courses/${courseId}`);
        const quizRef = db.doc(`courses/${courseId}/quizzes/${quizId}`);
        const [courseSnap, quizSnap] = await Promise.all([
            transaction.get(courseRef),
            transaction.get(quizRef),
        ]);
        if (!courseSnap.exists || !((_a = courseSnap.data()) === null || _a === void 0 ? void 0 : _a.published)) {
            throw new https_1.HttpsError("failed-precondition", "Quiz is not available");
        }
        if (!quizSnap.exists) {
            throw new https_1.HttpsError("not-found", "Quiz was not found");
        }
        const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${courseId}`));
        assertEnrolled(enrollmentSnap.data(), userId, courseId);
        const quiz = Object.assign({ id: quizSnap.id }, quizSnap.data());
        const maxAttempts = Math.max(1, Number((_b = quiz.maxAttempts) !== null && _b !== void 0 ? _b : 1));
        const attemptsForQuiz = await countAttemptsForQuiz(transaction, db, userId, courseId, quizId);
        if (attemptsForQuiz >= maxAttempts) {
            throw new https_1.HttpsError("failed-precondition", "Quiz attempts have been used");
        }
        const now = Date.now();
        const timeLimitSeconds = getQuizTimeLimitSeconds(quiz);
        const startedAt = firestore_1.Timestamp.fromMillis(now);
        const expiresAt = timeLimitSeconds === null ? null : firestore_1.Timestamp.fromMillis(now + timeLimitSeconds * 1000);
        const sessionRef = db.doc(`quizSessions/${getSessionDocId(userId, quizId)}`);
        const sessionSnap = await transaction.get(sessionRef);
        const existingSession = sessionSnap.exists ? sessionSnap.data() : null;
        if ((existingSession === null || existingSession === void 0 ? void 0 : existingSession.status) === "pending") {
            const existingExpiresAtMs = (_e = (_d = (_c = existingSession.expiresAt) === null || _c === void 0 ? void 0 : _c.toMillis) === null || _d === void 0 ? void 0 : _d.call(_c)) !== null && _e !== void 0 ? _e : null;
            if (existingExpiresAtMs === null || Date.now() <= existingExpiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
                throw new https_1.HttpsError("already-exists", "Quiz attempt already in progress");
            }
        }
        transaction.set(sessionRef, {
            userId,
            quizId,
            courseId,
            status: "pending",
            startedAt,
            expiresAt,
            maxAttempts,
            timeLimitSeconds,
            createdAt: startedAt,
        });
        return {
            sessionId: sessionRef.id,
            attemptsUsed: attemptsForQuiz,
            expiresAtMs: (_f = expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toMillis()) !== null && _f !== void 0 ? _f : null,
        };
    });
});
exports.submitQuizAttempt = (0, https_1.onCall)(async (request) => {
    var _a;
    const { sessionId, answers } = request.data;
    if (!sessionId || !Array.isArray(answers)) {
        throw new https_1.HttpsError("invalid-argument", "Missing sessionId or answers");
    }
    // H4: Validate sessionId to prevent Firestore path traversal
    assertValidSessionId(sessionId);
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError("unauthenticated", "Please sign in to submit your quiz");
    }
    const db = admin.firestore();
    return db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const sessionRef = db.doc(`quizSessions/${sessionId}`);
        const sessionSnap = await transaction.get(sessionRef);
        if (!sessionSnap.exists) {
            throw new https_1.HttpsError("not-found", "Quiz session was not found");
        }
        const session = sessionSnap.data();
        if (session.userId !== userId) {
            throw new https_1.HttpsError("permission-denied", "Quiz session does not belong to this user");
        }
        if (session.status === "completed") {
            throw new https_1.HttpsError("failed-precondition", "Quiz has already been submitted");
        }
        if (session.status === "expired") {
            throw new https_1.HttpsError("failed-precondition", "Quiz session has expired");
        }
        const sessionCourseId = session.courseId;
        const sessionQuizId = session.quizId;
        const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${sessionCourseId}`));
        assertEnrolled(enrollmentSnap.data(), userId, sessionCourseId);
        const courseRef = db.doc(`courses/${sessionCourseId}`);
        const quizRef = db.doc(`courses/${sessionCourseId}/quizzes/${sessionQuizId}`);
        const [courseSnap, quizSnap] = await Promise.all([
            transaction.get(courseRef),
            transaction.get(quizRef),
        ]);
        if (!courseSnap.exists || !((_a = courseSnap.data()) === null || _a === void 0 ? void 0 : _a.published)) {
            throw new https_1.HttpsError("failed-precondition", "Quiz is not available");
        }
        if (!quizSnap.exists) {
            throw new https_1.HttpsError("not-found", "Quiz was not found");
        }
        const quiz = Object.assign({ id: quizSnap.id }, quizSnap.data());
        const maxAttempts = Math.max(1, Number((_c = (_b = session.maxAttempts) !== null && _b !== void 0 ? _b : quiz.maxAttempts) !== null && _c !== void 0 ? _c : 1));
        const attemptsForQuiz = await countAttemptsForQuiz(transaction, db, userId, sessionCourseId, sessionQuizId);
        if (attemptsForQuiz >= maxAttempts) {
            throw new https_1.HttpsError("failed-precondition", "Quiz attempts have been used");
        }
        const expiresAtMs = (_f = (_e = (_d = session.expiresAt) === null || _d === void 0 ? void 0 : _d.toMillis) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : null;
        if (expiresAtMs !== null && Date.now() > expiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
            throw new https_1.HttpsError("deadline-exceeded", "Quiz time limit exceeded");
        }
        validateAnswers(quiz, answers);
        const score = getQuizScore(quiz, answers);
        // Coerce defensively: rules guarantee a numeric passPercentage on new
        // quizzes, but a legacy/malformed doc must not produce `passed: NaN`.
        const passPercentage = Number((_g = quiz.passPercentage) !== null && _g !== void 0 ? _g : 0);
        const passed = score >= passPercentage;
        const attemptRef = db.collection("quizAttempts").doc();
        const completedAt = firestore_1.FieldValue.serverTimestamp();
        transaction.set(attemptRef, {
            userId,
            quizId: sessionQuizId,
            courseId: sessionCourseId,
            answers,
            score,
            passed,
            completedAt,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            status: "completed",
        });
        transaction.set(sessionRef, {
            status: "completed",
            attemptId: attemptRef.id,
            score,
            passed,
            answers,
            completedAt,
        }, { merge: true });
        const questions = (_h = quiz.questions) !== null && _h !== void 0 ? _h : [];
        const review = questions.map((question, index) => {
            const correctIndex = Number(question.correctAnswerIndex);
            const selectedIndex = answers[index];
            return Object.assign({ selectedIndex,
                correctIndex, isCorrect: selectedIndex === correctIndex }, (typeof question.explanation === "string" && question.explanation.length > 0
                ? { explanation: question.explanation }
                : {}));
        });
        return {
            attemptId: attemptRef.id,
            score,
            passed,
            attemptsUsed: attemptsForQuiz + 1,
            review,
        };
    });
});
//# sourceMappingURL=quiz-attempts.js.map