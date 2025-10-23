// Prepare workspace and data for LightRAG upload with workspace isolation
//
// Changes from original:
// 1. Workspace name: wippli_{id} instead of wippli_{id}_{timestamp}
// 2. Added token generation for secure workspace URLs (browser-compatible)
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
// Using simple hash function (no crypto module needed in n8n sandbox)
const SECRET_KEY = 'LAOO_LIGHTRAG_SECRET_2025';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateToken(workspace) {
  const combined = workspace + SECRET_KEY;
  // Create 16-char token from two 8-char hashes
  const hash1 = simpleHash(combined);
  const hash2 = simpleHash(combined.split('').reverse().join(''));
  return hash1 + hash2;
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
