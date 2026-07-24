"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQuizAttempt = exports.startQuizAttempt = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const QUIZ_SUBMISSION_GRACE_MS = 5000;
function getQuizTimeLimitSeconds(quiz) {
    if (quiz.timeLimit === undefined || quiz.timeLimit === null) {
        return null;
    }
    return Math.max(0, Number(quiz.timeLimit)) * 60;
}
function getQuizScore(quiz, answers) {
    var _a;
    const questions = (_a = quiz.questions) !== null && _a !== void 0 ? _a : [];
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
        throw new Error("User is not enrolled in this course");
    }
}
exports.startQuizAttempt = (0, https_1.onCall)(async (request) => {
    var _a;
    const { courseId, quizId } = request.data;
    if (!courseId || !quizId) {
        throw new Error("Missing courseId or quizId");
    }
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new Error("Unauthenticated");
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
            throw new Error("Quiz is not available");
        }
        if (!quizSnap.exists) {
            throw new Error("Quiz was not found");
        }
        const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${courseId}`));
        assertEnrolled(enrollmentSnap.data(), userId, courseId);
        const quiz = Object.assign({ id: quizSnap.id }, quizSnap.data());
        const maxAttempts = Math.max(1, Number((_b = quiz.maxAttempts) !== null && _b !== void 0 ? _b : 1));
        const attemptsQuery = db
            .collection("quizAttempts")
            .where("userId", "==", userId)
            .where("courseId", "==", courseId)
            .where("quizId", "==", quizId)
            .limit(maxAttempts);
        const attemptsSnap = await transaction.get(attemptsQuery);
        if (attemptsSnap.size >= maxAttempts) {
            throw new Error("Quiz attempts have been used");
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
                throw new Error("Quiz attempt already in progress");
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
            attemptsUsed: attemptsSnap.size,
            expiresAtMs: (_f = expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toMillis()) !== null && _f !== void 0 ? _f : null,
        };
    });
});
exports.submitQuizAttempt = (0, https_1.onCall)(async (request) => {
    var _a;
    const { sessionId, answers } = request.data;
    if (!sessionId || !Array.isArray(answers)) {
        throw new Error("Missing sessionId or answers");
    }
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new Error("Unauthenticated");
    }
    const db = admin.firestore();
    return db.runTransaction(async (transaction) => {
        var _a, _b, _c, _d, _e, _f;
        const sessionRef = db.doc(`quizSessions/${sessionId}`);
        const sessionSnap = await transaction.get(sessionRef);
        if (!sessionSnap.exists) {
            throw new Error("Quiz session was not found");
        }
        const session = sessionSnap.data();
        if (session.userId !== userId) {
            throw new Error("Quiz session does not belong to this user");
        }
        if (session.status === "completed") {
            throw new Error("Quiz has already been submitted");
        }
        if (session.status === "expired") {
            throw new Error("Quiz session has expired");
        }
        const enrollmentSnap = await transaction.get(db.doc(`enrollments/${userId}_${session.courseId}`));
        assertEnrolled(enrollmentSnap.data(), userId, session.courseId);
        const courseRef = db.doc(`courses/${session.courseId}`);
        const quizRef = db.doc(`courses/${session.courseId}/quizzes/${session.quizId}`);
        const [courseSnap, quizSnap] = await Promise.all([
            transaction.get(courseRef),
            transaction.get(quizRef),
        ]);
        if (!courseSnap.exists || !((_a = courseSnap.data()) === null || _a === void 0 ? void 0 : _a.published)) {
            throw new Error("Quiz is not available");
        }
        if (!quizSnap.exists) {
            throw new Error("Quiz was not found");
        }
        const quiz = Object.assign({ id: quizSnap.id }, quizSnap.data());
        const maxAttempts = Math.max(1, Number((_c = (_b = session.maxAttempts) !== null && _b !== void 0 ? _b : quiz.maxAttempts) !== null && _c !== void 0 ? _c : 1));
        const attemptsQuery = db
            .collection("quizAttempts")
            .where("userId", "==", userId)
            .where("courseId", "==", session.courseId)
            .where("quizId", "==", session.quizId)
            .limit(maxAttempts);
        const attemptsSnap = await transaction.get(attemptsQuery);
        if (attemptsSnap.size >= maxAttempts) {
            throw new Error("Quiz attempts have been used");
        }
        const expiresAtMs = (_f = (_e = (_d = session.expiresAt) === null || _d === void 0 ? void 0 : _d.toMillis) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : null;
        if (expiresAtMs !== null && Date.now() > expiresAtMs + QUIZ_SUBMISSION_GRACE_MS) {
            throw new Error("Quiz time limit exceeded");
        }
        validateAnswers(quiz, answers);
        const score = getQuizScore(quiz, answers);
        const passed = score >= quiz.passPercentage;
        const attemptRef = db.collection("quizAttempts").doc();
        const completedAt = firestore_1.FieldValue.serverTimestamp();
        transaction.set(attemptRef, {
            userId,
            quizId: session.quizId,
            courseId: session.courseId,
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
        return {
            attemptId: attemptRef.id,
            score,
            passed,
            attemptsUsed: attemptsSnap.size + 1,
        };
    });
});
//# sourceMappingURL=quiz-attempts.js.map