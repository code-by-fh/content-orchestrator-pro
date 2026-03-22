-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "useOpenRouter" BOOLEAN NOT NULL DEFAULT false,
    "openrouterApiKey" TEXT,
    "openrouterModel" TEXT DEFAULT 'openai/gpt-4o-mini',
    "openrouterBaseUrl" TEXT DEFAULT 'https://openrouter.ai/api/v1',

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
