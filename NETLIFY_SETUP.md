# Netlify Deployment Setup

To ensure your application "Master App Builder" runs correctly on Netlify, you must configure the following Environment Variables in the Netlify Dashboard.

## Required Environment Variables

Go to **Site configuration > Environment variables** in your Netlify dashboard and add the following keys:

### Sandbox & Web Scraping
*   `E2B_API_KEY`: Your API key from [e2b.dev](https://e2b.dev) (Required for code execution sandboxes). Ensure this is set correctly to avoid "401: authorization header is missing" errors.
*   `FIRECRAWL_API_KEY`: Your API key from [firecrawl.dev](https://firecrawl.dev) (Required for web scraping). Ensure this is set correctly to avoid scraping failures.

### AI Model Providers
*You need at least one of these to generate code:*

*   `OPENAI_API_KEY`: API Key from OpenAI (for GPT-4o, GPT-5)
*   `ANTHROPIC_API_KEY`: API Key from Anthropic (for Claude 3.5 Sonnet)
*   `GEMINI_API_KEY`: API Key from Google AI Studio (for Gemini 1.5 Pro)
*   `GROQ_API_KEY`: API Key from Groq (for fast inference models like Llama 3)

## Build Settings

These should be automatically detected from `netlify.toml`, but verify them:

*   **Build command**: `pnpm build`
*   **Publish directory**: `.next` (Netlify's Next.js Runtime handles this, usually `.next` or left blank)
*   **Node Version**: `20` (Set via `NODE_VERSION` environment variable or `.nvmrc`)

## Troubleshooting

If you encounter "Missing API Key" errors during runtime, ensure you have redeployed the site *after* adding the environment variables.
