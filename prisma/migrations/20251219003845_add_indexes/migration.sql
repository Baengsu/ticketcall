-- CreateIndex
CREATE INDEX "Post_isHidden_idx" ON "Post"("isHidden");

-- CreateIndex
CREATE INDEX "RebuildLog_status_idx" ON "RebuildLog"("status");

-- CreateIndex
CREATE INDEX "RebuildLog_createdAt_idx" ON "RebuildLog"("createdAt");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Report_postId_idx" ON "Report"("postId");

-- CreateIndex
CREATE INDEX "EtcEvent_userId_idx" ON "EtcEvent"("userId");

-- CreateIndex
CREATE INDEX "EtcEvent_datetime_idx" ON "EtcEvent"("datetime");
