"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgentKeypair = generateAgentKeypair;
exports.signMessage = signMessage;
exports.verifySignature = verifySignature;
exports.buildMessage = buildMessage;
// packages/crypto/src/index.ts
const crypto = __importStar(require("node:crypto"));
// Generate keypair for agent (called once on first install)
function generateAgentKeypair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, publicKey };
}
// Agent calls this before every request
// message = what we're signing (providerId + timestamp + action)
function signMessage(message, privateKeyPem) {
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signature = crypto.sign(null, Buffer.from(message), privateKey);
    return signature.toString('base64');
}
// Server calls this to verify
function verifySignature(message, signature, publicKeyPem) {
    try {
        const publicKey = crypto.createPublicKey(publicKeyPem);
        return crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(signature, 'base64'));
    }
    catch {
        return false;
    }
}
// What message to sign — timestamp prevents replay attacks
// Agent and server must agree on this exact format
function buildMessage(providerId, action, timestamp) {
    return `${providerId}:${action}:${timestamp}`;
}
