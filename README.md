# Content Orchestrator Pro

A powerful content orchestration platform.

## Getting Started

### Prerequisites
- Node.js
- Docker (optional, for database)

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    cd client && npm install
    cd ../server && npm install
    ```
3.  Start the development servers:
    ```bash
    # In one terminal
    cd server && npm run dev

    # In another terminal
    cd client && npm run dev
    ```

### Content Management Integration (Images)
In order to automatically import local images to a CMS (e.g., Directus) upon article publishing, you must configure the following in `server/.env`:
```env
CONTENT_MANAGEMENT_IMAGE_URL="https://your-cms-instance.de/files"
CONTENT_MANAGEMENT_TOKEN="your-cms-token"
```
When configured, any local images uploaded to the editor (`/uploads/...`) will be sent to the CMS when the article is published. The markdown URLs will be updated to point to the CMS assets, and the local files will be deleted.

## Default Login

The application comes with a default administrator account:

- **Username:** `admin`
- **Password:** `123`

## Features
- **Dashboard:** Overview of your content.
- **Article Editor:** Write and edit articles.
- **Content Management:** Manage various content types.
