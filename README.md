# Content Orchestrator Pro 🚀

Content Orchestrator Pro is a powerful content orchestration platform designed specifically for professional marketers and tech content creators. Transform transcripts into high-quality articles, manage cross-platform distribution, and automate your SEO workflow – all in one central place.

## 🌟 Key Features

- **AI-Powered Content Engine**: Powered by Google Gemini, it transforms YouTube transcripts or Medium articles into structured, SEO-optimized technical articles.
- **Multi-Channel Distribution**: One-click publishing to LinkedIn, Medium, Xing, RSS, and via Webhooks.
- **Automated SEO & Social Assets**: Automatic generation of meta descriptions, SEO slugs, LinkedIn teasers, and Xing summaries.
- **Modern Markdown Editor**: A feature-rich editor with real-time preview, drag-and-drop support for images, and automatic CMS synchronization.
- **Dynamic Image Orchestration**: Automatic upload of local images to your CMS (e.g., Directus), including link rewriting for production.
- **Multilingual Support**: Seamlessly manage and translate content between German and English.
- **Scheduling**: Plan your content calendar with the integrated publishing schedule feature.

## 🚀 Onboarding & Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (for the database)
- **Redis** (for background queue processing)
- **Python 3** (with `youtube-transcript-api` for YouTube imports)
- **Gemini API Key** (available in Google AI Studio)

### 2. Quick Start
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-repo/content-orchestrator-pro.git
    cd content-orchestrator-pro
    ```

2.  **Setup Server:**
    ```bash
    cd server
    npm install
    cp .env.example .env
    # Edit the .env file and enter your credentials (DB, Redis, Gemini API)
    npx prisma db push
    ```

3.  **Setup Client:**
    ```bash
    cd ../client
    npm install
    ```

4.  **Start Development Mode:**
    ```bash
    # Terminal 1 (Server)
    cd server && npm run dev

    # Terminal 2 (Client)
    cd client && npm run dev
    ```

5.  **Login:**
    By default available at `http://localhost:5173`
    -   **Username:** `admin`
    -   **Password:** `123`

## 🛠️ How It Works

### The Content Lifecycle
1.  **Ingestion**: Provide a source (YouTube Video URL or Medium Link).
2.  **AI Refinement**: A background worker (BullMQ) extracts the text/transcript and uses Gemini AI to structure the content into a technical article with correct H-levels, code blocks, and citations.
3.  **Orchestration**: Fine-tune the article in the dashboard, add images, and adjust SEO settings.
4.  **Distribution**: Select target platforms and languages. The system handles platform-specific requirements (e.g., character limits for Xing or teasers for LinkedIn).

### Automatic Image Pipeline
When you publish an article containing local images, the system performs the following steps:
- Uploads images to the configured CMS.
- Rewrites Markdown links to production URLs.
- SEO-optimizes filenames based on alt-text.
- Deletes temporary local files.

## ⚙️ Special Considerations & Configuration

- **Environment Variables**: The `server/.env` is essential. Ensure `PUBLIC_ARTICLE_BASE_URL` matches your frontend URL so links in RSS feeds and webhooks are generated correctly.
- **CMS Integration**: Once `CONTENT_MANAGEMENT_IMAGE_URL` is configured, all local `/uploads/` images will be migrated upon first publication.
- **Queue System**: Uses Redis for robust AI generation. Ensure your Redis server is accessible via the parameters specified in the `.env`.
- **YouTube Extraction**: Requires Python in the system environment. Install the dependency with: `pip install youtube-transcript-api`.
