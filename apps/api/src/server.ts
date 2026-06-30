import "dotenv/config";
import app from "./app";

// Start BullMQ workers
import "./jobs/workers";
import { emailQueue } from "./jobs/queues";
import { enqueueWeeklyDigests, cleanupExpiredPhotos } from "./jobs/scheduledJobs";

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, async () => {
  console.log(`[Server] running on http://localhost:${PORT}`);

  await emailQueue.add(
    "weekly-digest",
    {},
    {
      repeat: { pattern: "0 9 * * 0" },
      jobId: "weekly-style-digest",
      removeOnComplete: true,
    },
  );

  await emailQueue.add(
    "photo-cleanup",
    {},
    {
      repeat: { pattern: "0 3 * * *" },
      jobId: "photo-cleanup-daily",
      removeOnComplete: true,
    },
  );
});
