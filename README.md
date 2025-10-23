# LAOO LightRAG Configuration

Production-ready LightRAG deployment on Azure with per-workspace isolation and n8n integration.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

This repository provides a complete, production-ready setup for deploying LightRAG (knowledge graph generation) with:

- **Per-workspace isolation** - Each project/task gets its own isolated knowledge graph
- **Azure OpenAI integration** - Uses GPT-4o and text-embedding-3-large
- **n8n workflow automation** - Automated document processing pipeline
- **Persistent storage** - Azure File Share for workspace data
- **Tokenized access** - Secure, obfuscated workspace URLs

### Use Cases

- Legal document analysis with knowledge graph visualization
- Multi-tenant document processing
- Isolated knowledge bases per project/client
- Automated RAG (Retrieval-Augmented Generation) workflows

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Wippli    │─────▶│  n8n Visual  │─────▶│  LightRAG   │
│  Platform   │      │  Law Workflow│      │  Container  │
└─────────────┘      └──────────────┘      └─────────────┘
                             │                      │
                             ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │    Azure     │      │    Azure    │
                     │  Document    │      │ File Share  │
                     │ Intelligence │      │   Storage   │
                     └──────────────┘      └─────────────┘
                             │                      │
                             └──────────┬───────────┘
                                        ▼
                                ┌──────────────┐
                                │ Azure OpenAI │
                                │  (GPT-4o +   │
                                │  Embeddings) │
                                └──────────────┘
```

### Workspace Isolation

Each workspace (`wippli_{id}`) contains:
- Isolated knowledge graph
- Separate vector embeddings
- Independent document storage
- Dedicated query context

## Prerequisites

### Required Services

- **Azure Subscription** with:
  - Azure Container Apps
  - Azure OpenAI Service (with gpt-4o and text-embedding-3-large deployments)
  - Azure Document Intelligence
  - Azure Storage Account (with File Share)
- **n8n instance** (self-hosted or cloud)
- **GitHub account** (for version control)

### Required Tools

```bash
# Install Azure CLI
brew install azure-cli  # macOS
# or
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Ubuntu

# Install jq
brew install jq  # macOS
# or
sudo apt-get install jq  # Ubuntu

# Install Node.js (for scripts)
brew install node  # macOS
# or
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs  # Ubuntu
```

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/laoo-master/laoo-visual-law-kg.git
cd laoo-visual-law-kg

# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Configure Environment

Edit `.env` with your Azure credentials:

```bash
# Azure Configuration
AZURE_SUBSCRIPTION="Your Subscription Name"
AZURE_RESOURCE_GROUP="your-resource-group"
AZURE_LOCATION="uksouth"

# Azure OpenAI
AZURE_OPENAI_ENDPOINT="https://your-openai.openai.azure.com/"
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-4o-deployment"
AZURE_OPENAI_EMBED_DEPLOYMENT="embedding-deployment"

# Storage
STORAGE_ACCOUNT="yourstorageaccount"
STORAGE_KEY="your-storage-key"

# n8n
N8N_URL="https://n8n.yourdomain.com"
N8N_API_KEY="your-n8n-api-key"

# LightRAG
LIGHTRAG_SECRET_KEY="your-random-secret-key-here"
```

### 3. Deploy Infrastructure

```bash
# Login to Azure
az login

# Run deployment script
./scripts/deploy-lightrag.sh
```

### 4. Import n8n Workflow

```bash
# Import Visual Law workflow
./scripts/import-n8n-workflow.sh
```

## Configuration

### Environment Variables

See [`.env.example`](.env.example) for all configurable variables.

Key configurations:

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | Yes |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Yes |
| `LIGHTRAG_SECRET_KEY` | Secret for workspace token generation | Yes |
| `STORAGE_ACCOUNT` | Azure Storage account name | Yes |
| `N8N_URL` | n8n instance URL | Yes |

### Workspace Configuration

Workspaces are automatically created per Wippli ID:

- **Format:** `wippli_{id}`
- **Location:** Azure File Share `lightrag-data/rag_storage/wippli_{id}/`
- **Access URL:** `https://your-lightrag-url/w/{token}`

### Token Generation

Tokens are generated using SHA-256 hash:

```javascript
token = sha256(workspace_name + LIGHTRAG_SECRET_KEY).substring(0, 16)
```

## Deployment

### Manual Deployment

1. **Create Resource Group**
```bash
az group create \
  --name laoo-uk-rg \
  --location uksouth
```

2. **Deploy Storage**
```bash
./scripts/deploy-storage.sh
```

3. **Deploy LightRAG Container**
```bash
./scripts/deploy-lightrag.sh
```

4. **Configure n8n**
```bash
./scripts/import-n8n-workflow.sh
```

### Automated Deployment

Use the provided GitHub Actions workflow:

```bash
git push origin main
# GitHub Actions will automatically deploy
```

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

## Usage

### Creating a Workspace

Workspaces are automatically created when documents are uploaded via the n8n workflow:

```bash
# Example webhook call
curl -X POST "https://n8n.yourdomain.com/webhook/visual-law" \
  -H "Content-Type: application/json" \
  -d '{
    "wippli_id": 339,
    "document_url": "https://example.com/document.pdf",
    "question": "Analyze this legal document"
  }'
```

Response includes workspace URL:
```json
{
  "workspace": "wippli_339",
  "workspace_url": "https://lightrag.yourdomain.com/w/7f3a9c2b8e1d4f6a",
  "status": "processed"
}
```

### Accessing a Workspace

Navigate to the tokenized URL:
```
https://lightrag.yourdomain.com/w/7f3a9c2b8e1d4f6a
```

### Querying the Knowledge Graph

```bash
curl -X POST "https://lightrag.yourdomain.com/query?workspace=wippli_339" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main relationships in this document?",
    "mode": "hybrid"
  }'
```

### Managing Workspaces

```bash
# List all workspaces
./scripts/list-workspaces.sh

# Backup workspace
./scripts/backup-workspace.sh wippli_339

# Delete workspace
./scripts/delete-workspace.sh wippli_339
```

## Troubleshooting

### Common Issues

**Issue: Workspace not created**
```bash
# Check LightRAG logs
az containerapp logs show \
  --name laoo-uk-lightrag \
  --resource-group laoo-uk-rg \
  --tail 50
```

**Issue: Token not working**
```bash
# Verify token generation
node scripts/generate-token.js wippli_339
```

**Issue: Documents not processing**
```bash
# Check n8n execution logs
curl "https://n8n.yourdomain.com/api/v1/executions" \
  -H "X-N8N-API-KEY: {your-key}"
```

### Logs

```bash
# LightRAG container logs
az containerapp logs show --name laoo-uk-lightrag -g laoo-uk-rg

# Check storage
az storage file list \
  --share-name lightrag-data \
  --path "rag_storage" \
  --account-name {your-account}
```

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
├── azure/
│   ├── container-app-template.json   # Container App ARM template
│   ├── env-vars.json                 # Environment variables
│   ├── storage-config.json           # Storage configuration
│   └── deployment-scripts/
│       ├── deploy-storage.sh
│       └── deploy-container.sh
├── n8n/
│   ├── visual-law-workflow.json      # Main workflow
│   └── README.md                     # Workflow documentation
├── lightrag/
│   ├── config/
│   │   └── workspace-config.yaml
│   └── Dockerfile                    # Custom image (if needed)
├── scripts/
│   ├── deploy-lightrag.sh            # Full deployment
│   ├── import-n8n-workflow.sh        # Import workflow
│   ├── generate-token.js             # Token generator
│   ├── list-workspaces.sh            # List workspaces
│   ├── backup-workspace.sh           # Backup workspace
│   └── rollback.sh                   # Rollback deployment
├── docs/
│   ├── WORKSPACE_ARCHITECTURE.md     # Architecture details
│   ├── API.md                        # API documentation
│   └── DEPLOYMENT_GUIDE.md           # Detailed deployment
├── backup/                           # Configuration backups
├── .env.example                      # Environment template
├── .gitignore
└── README.md                         # This file
```

## Security

- **Secrets:** Never commit `.env` or files containing API keys
- **Tokens:** Use strong random values for `LIGHTRAG_SECRET_KEY`
- **Access:** Tokens provide URL obfuscation, not authentication
- **Storage:** Use Azure RBAC to control storage access

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues:** https://github.com/laoo-master/laoo-visual-law-kg/issues
- **Documentation:** https://github.com/laoo-master/laoo-visual-law-kg/wiki
- **Email:** admin@laoo.dev

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**Built with** ❤️ **by LAOO Team**
