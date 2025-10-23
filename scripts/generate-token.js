#!/usr/bin/env node

/**
 * Generate workspace access token
 *
 * Token is generated using simple hash function (compatible with n8n sandbox)
 * This provides URL obfuscation without requiring crypto module
 *
 * Usage:
 *   node generate-token.js wippli_339
 *   node generate-token.js wippli_339 custom-secret-key
 */

// Default secret key (should match in n8n workflow)
const DEFAULT_SECRET = process.env.LIGHTRAG_SECRET_KEY || 'LAOO_LIGHTRAG_SECRET_2025';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateToken(workspace, secret = DEFAULT_SECRET) {
  const combined = workspace + secret;
  // Create 16-char token from two 8-char hashes
  const hash1 = simpleHash(combined);
  const hash2 = simpleHash(combined.split('').reverse().join(''));
  return hash1 + hash2;
}

function reverseEngineerWorkspace(token, candidateIds, secret = DEFAULT_SECRET) {
  // Try to find which wippli_id matches this token
  for (const id of candidateIds) {
    const workspace = `wippli_${id}`;
    if (generateToken(workspace, secret) === token) {
      return workspace;
    }
  }
  return null;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node generate-token.js <workspace> [secret]');
    console.log('');
    console.log('Examples:');
    console.log('  node generate-token.js wippli_339');
    console.log('  node generate-token.js wippli_340 custom-secret');
    console.log('');
    console.log('Environment variable LIGHTRAG_SECRET_KEY will be used if set');
    process.exit(1);
  }

  const workspace = args[0];
  const secret = args[1] || DEFAULT_SECRET;
  const token = generateToken(workspace, secret);

  console.log(`Workspace: ${workspace}`);
  console.log(`Token:     ${token}`);
  console.log(`URL:       https://lightrag.uk.laoo.dev/w/${token}`);

  // Show alternative formats
  console.log('');
  console.log('For n8n workflow:');
  console.log(`  workspace: "${workspace}"`);
  console.log(`  workspace_token: "${token}"`);
  console.log(`  workspace_url: "https://lightrag.uk.laoo.dev/w/${token}"`);

  console.log('');
  console.log('Note: Using simple hash algorithm (n8n sandbox compatible)');
}

module.exports = { generateToken, reverseEngineerWorkspace };
