-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectName_fkey" FOREIGN KEY ("projectName") REFERENCES "Project"("name") ON DELETE SET NULL ON UPDATE CASCADE;
