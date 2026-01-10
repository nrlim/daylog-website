-- CreateTable TopPerformer
CREATE TABLE "TopPerformer" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopPerformer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopPerformer_teamId_rank_month_year_key" ON "TopPerformer"("teamId", "rank", "month", "year");

-- AddForeignKey
ALTER TABLE "TopPerformer" ADD CONSTRAINT "TopPerformer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "TopPerformer" ADD CONSTRAINT "TopPerformer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
