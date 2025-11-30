# Voice Notes 2.0 - Cloudflare Worker

This Cloudflare Worker provides secure API key management and AI processing for the Voice Notes 2.0 application.

## Features

- **Multi-Provider AI Support**: Anthropic Claude, OpenAI GPT, and Together AI
- **Secure API Key Management**: API keys stored as environment secrets
- **Text Analysis**: Structured extraction from survey transcripts
- **Database Access**: Session storage via D1 or KV

## Endpoints

### Health Check
- `GET /` or `GET /health` - Returns worker status and provider availability

### Text Analysis
- `POST /text` or `POST /analyze` - Analyze transcript and extract structured sections

```json
{
  "transcript": "Survey transcript text...",
  "expectedSections": ["Needs", "System characteristics", ...],
  "provider": "openai" // or "anthropic" or "together"
}
```

### Direct API Calls
- `POST /api/anthropic` - Direct Anthropic API call
- `POST /api/openai` - Direct OpenAI API call
- `POST /api/together` - Direct Together AI call

### Session Management
- `GET /sessions` - List all sessions
- `POST /sessions` - Save a session
- `GET /sessions/:id` - Get a specific session
- `PUT /sessions/:id` - Update a session
- `DELETE /sessions/:id` - Delete a session

### Provider Info
- `GET /providers` - Get configured providers and available models

## Setup

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Set API Key Secrets
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put TOGETHER_API_KEY
```

### 4. Deploy
```bash
wrangler deploy
```

## Optional: Database Setup

### D1 Database
```bash
# Create database
wrangler d1 create voice-notes-db

# Update wrangler.toml with database_id

# Run migrations
wrangler d1 execute voice-notes-db --file=./schema.sql
```

### KV Namespace
```bash
# Create namespace
wrangler kv:namespace create SESSIONS

# Update wrangler.toml with namespace id
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| ANTHROPIC_API_KEY | Anthropic Claude API key | Optional |
| OPENAI_API_KEY | OpenAI API key | Recommended |
| TOGETHER_API_KEY | Together AI API key | Optional |

## Response Format

All endpoints return JSON with CORS headers enabled.

Success:
```json
{
  "sections": [...],
  "summary": "...",
  "checklistHits": [...],
  "materials": [...]
}
```

Error:
```json
{
  "error": "Error message",
  "success": false
}
```

## License

Part of Voice Notes 2.0 project.
