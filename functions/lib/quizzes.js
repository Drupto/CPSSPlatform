"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizForStudent = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
// Same strict validation as quiz-attempts.ts (no slashes → no path traversal).
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
function sanitizeQuestion(question) {
    const options = Array.isArray(question.options) ? question.options.map(String) : [];
    return {
        id: typeof question.id === "string" ? question.id : "",
        question: typeof question.question === "string" ? question.question : "",
        options,
    };
}
function sanitizeQuiz(quizId, courseId, data) {
    var _a;
    const questions = Array.isArray(data.questions) ? data.questions : [];
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ id: quizId, courseId, title: typeof data.title === "string" ? data.title : "", description: typeof data.description === "string" ? data.description : "", passPercentage: Number((_a = data.passPercentage) !== null && _a !== void 0 ? _a : 0) }, (data.maxAttempts !== undefined && { maxAttempts: Number(data.maxAttempts) })), (data.timeLimit !== undefined && data.timeLimit !== null && { timeLimit: Number(data.timeLimit) })), (data.randomizeQuestionOrder !== undefined && {
        randomizeQuestionOrder: Boolean(data.randomizeQuestionOrder),
    })), (data.randomizeAnswerOrder !== undefined && {
        randomizeAnswerOrder: Boolean(data.randomizeAnswerOrder),
    })), { questions: questions.map(sanitizeQuestion) });
}
exports.getQuizForStudent = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!userId) {
        throw new https_1.HttpsError("unauthenticated", "Please sign in to view quizzes");
    }
    const { courseId, quizId } = (_b = request.data) !== null && _b !== void 0 ? _b : {};
    if (typeof courseId !== "string" || !ID_RE.test(courseId)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid courseId");
    }
    if (quizId !== undefined && (typeof quizId !== "string" || !ID_RE.test(quizId))) {
        throw new https_1.HttpsError("invalid-argument", "Invalid quizId");
    }
    const db = admin.firestore();
    const [courseSnap, enrollmentSnap] = await Promise.all([
        db.doc(`courses/${courseId}`).get(),
        db.doc(`enrollments/${userId}_${courseId}`).get(),
    ]);
    if (!courseSnap.exists || !((_c = courseSnap.data()) === null || _c === void 0 ? void 0 : _c.published)) {
        throw new https_1.HttpsError("failed-precondition", "Course is not available");
    }
    const enrollment = enrollmentSnap.data();
    if (!enrollment ||
        enrollment.userId !== userId ||
        enrollment.courseId !== courseId ||
        enrollment.status !== "approved") {
        throw new https_1.HttpsError("permission-denied", "You are not enrolled in this course");
    }
    let sanitized;
    if (quizId) {
        const quizDoc = await db.doc(`courses/${courseId}/quizzes/${quizId}`).get();
        if (!quizDoc.exists) {
            throw new https_1.HttpsError("not-found", "Quiz was not found");
        }
        sanitized = [sanitizeQuiz(quizDoc.id, courseId, quizDoc.data())];
    }
    else {
        const snapshot = await db
            .collection(`courses/${courseId}/quizzes`)
            .orderBy("createdAt", "desc")
            .get();
        sanitized = snapshot.docs.map((doc) => sanitizeQuiz(doc.id, courseId, doc.data()));
    }
    return { quizzes: sanitized };
});
//# sourceMappingURL=quizzes.js.map