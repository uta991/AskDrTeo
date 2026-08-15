-- AlterTable
ALTER TABLE "children" DROP COLUMN "avatarUrl",
ADD COLUMN     "avatarAssetId" TEXT;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_avatarAssetId_fkey" FOREIGN KEY ("avatarAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

