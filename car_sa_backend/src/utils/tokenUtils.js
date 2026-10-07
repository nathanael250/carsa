const crypto = require('crypto');

// Generate a 6-digit verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash code for secure storage
const hashCode = (code) => {
    return crypto.createHash('sha256').update(code).digest('hex');
};

// Verify code against hash
const verifyCode = (code, hash) => {
    const codeHash = hashCode(code);
    return codeHash === hash;
};

module.exports = {
    generateVerificationCode,
    hashCode,
    verifyCode,
};