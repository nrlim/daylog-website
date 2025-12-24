-- CreateTable
CREATE TABLE "AnonymousPokerSession" (
    "id" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "showResults" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnonymousPokerSession_pkey" PRIMARY KEY ("id")
);
