#!/usr/bin/env node

/**
 * Generate workspace access token
 *
 * Token is generated using SHA-256 hash of workspace name + secret key
 * This provides URL obfuscation without requiring database storage
 *
 * Usage:
 *   node generate-token.js wippli_339
 *   node generate-token.js wippli_339 custom-secret-key
 */

const crypto = require('crypto');

// Default secret key (should match LIGHTRAG_SECRET_KEY in .env)
const DEFAULT_SECRET = process.env.LIGHTRAG_SECRET_KEY || 'LAOO_LIGHTRAG_SECRET_2025';

function generateToken(workspace, secret = DEFAULT_SECRET) {
  const hash = crypto
    .createHash('sha256')
    .update(workspace + secret)
    .digest('hex');

  // Use first 16 characters for shorter URLs
  return hash.substring(0, 16);
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
}

module.exports = { generateToken, reverseEngineerWorkspace };
