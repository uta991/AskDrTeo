-- AlterTable
ALTER TABLE "news_posts" ADD COLUMN     "visibleFrom" TIMESTAMP(3),
ADD COLUMN     "visibleUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "news_posts_status_visibleFrom_visibleUntil_idx" ON "news_posts"("status", "visibleFrom", "visibleUntil");
