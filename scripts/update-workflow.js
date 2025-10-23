#!/usr/bin/env node

/**
 * Update Visual Law workflow with workspace isolation
 *
 * This script modifies the "Prepare Data" node to:
 * 1. Use wippli_{id} instead of wippli_{id}_{timestamp}
 * 2. Generate secure tokens for workspace URLs
 * 3. Return workspace_url in the response
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../n8n/visual-law-workflow.json');
const updatedPath = path.join(__dirname, '../n8n/visual-law-workflow-v2.json');

// Read the workflow
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// New "Prepare Data" code
const newPrepareDataCode = `// Prepare workspace and data for LightRAG upload with workspace isolation
//
// Changes from original:
// 1. Workspace name: wippli_{id} instead of wippli_{id}_{timestamp}
// 2. Added token generation for secure workspace URLs
// 3. Added workspace_url to response

const extractedText = $('Extract Text').first().json;
const loginData = $('Login LightRAG').item.json;
const originalInput = $('Prepare Document URL').first().json;

// Get wippli_id from the preserved data
const wippliId = originalInput.wippli_id || originalInput.wippliId || 'unknown';

// NEW: Remove timestamp from workspace name for persistence
// All documents for same wippli_id go to same workspace
const workspace = \`wippli_\${wippliId}\`;

// NEW: Generate secure token for workspace access
// Token is deterministic SHA-256 hash of workspace + secret
const crypto = require('crypto');
const SECRET_KEY = process.env.LIGHTRAG_SECRET_KEY || 'LAOO_LIGHTRAG_SECRET_2025';

function generateToken(workspace) {
  const hash = crypto
    .createHash('sha256')
    .update(workspace + SECRET_KEY)
    .digest('hex');
  return hash.substring(0, 16); // 16-char token
}

const workspaceToken = generateToken(workspace);
const workspaceUrl = \`https://lightrag.uk.laoo.dev/w/\${workspaceToken}\`;

// Get document content directly from Extract Text node
const docContent = extractedText.text || '';

console.log('=== Workspace Isolation Info ===');
console.log('Wippli ID:', wippliId);
console.log('Workspace:', workspace);
console.log('Token:', workspaceToken);
console.log('URL:', workspaceUrl);
console.log('Content length:', docContent.length);

if (!docContent || docContent.trim().length === 0) {
  throw new Error('No document content from Extract Text node!');
}

// Return data for LightRAG upload
return {
  // Workspace info
  workspace: workspace,
  workspace_token: workspaceToken,
  workspace_url: workspaceUrl,

  // LightRAG auth
  access_token: loginData.access_token.trim(),

  // Document data
  document_content: docContent,
  question: originalInput.question || 'Analyze this document',

  // Metadata
  wippli_id: wippliId,
  user: originalInput.user || 'system',
  pageCount: extractedText.pageCount || 0,
  status: extractedText.status || 'processed',

  // Timestamp for logging (not used in workspace name)
  timestamp: Date.now()
};`;

// Find and update the "Prepare Data" node
let nodeFound = false;
workflow.nodes = workflow.nodes.map(node => {
  if (node.name === 'Prepare Data') {
    nodeFound = true;
    console.log('✓ Found "Prepare Data" node');
    node.parameters.jsCode = newPrepareDataCode;
  }
  return node;
});

if (!nodeFound) {
  console.error('✗ Error: "Prepare Data" node not found in workflow');
  process.exit(1);
}

// Save updated workflow
fs.writeFileSync(updatedPath, JSON.stringify(workflow, null, 2));

console.log(`✓ Updated workflow saved to: ${updatedPath}`);
console.log('');
console.log('Changes made:');
console.log('  - Workspace naming: wippli_{id} (persistent per task)');
console.log('  - Token generation: SHA-256 based URL obfuscation');
console.log('  - Response includes: workspace_url for frontend integration');
console.log('');
console.log('Next steps:');
console.log('  1. Review the changes in visual-law-workflow-v2.json');
console.log('  2. Deploy to n8n using: npm run deploy-workflow');
console.log('  3. Test with a sample wippli task');
