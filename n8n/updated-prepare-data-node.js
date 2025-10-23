// Prepare workspace and data for LightRAG upload with workspace isolation
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
const workspace = `wippli_${wippliId}`;

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
const workspaceUrl = `https://lightrag.uk.laoo.dev/w/${workspaceToken}`;

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
};
