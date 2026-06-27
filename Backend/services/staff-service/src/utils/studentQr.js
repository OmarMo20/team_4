/**
 * ===========================================
 * Student QR Token Utility
 * ===========================================
 * Stores a value in DB (qrToken) and encodes that value into a QR image.
 * For simplicity of scanning, we now store the student's nationalId (student code)
 * directly instead of a long signed JWT.
 */

/**
 * Create a signed token to be encoded inside a student's QR.
 * NOTE: For easier scanning, this returns the plain studentCode (nationalId).
 */
function signStudentQrToken({ studentId, studentCode }) {
  if (!studentCode) {
    throw new Error('studentCode is required to sign QR token');
  }

  // Return short code directly → very simple, easy-to-scan QR
  return String(studentCode);
}

module.exports = {
  signStudentQrToken,
};


