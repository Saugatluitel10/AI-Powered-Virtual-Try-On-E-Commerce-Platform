import "dotenv/config";
import app from "./app";

// Start BullMQ workers
import "./jobs/workers";

const PORT = process.env.PORT ?? 8000;

app.listen(PORT, () => {
  console.log(`[Server] running on http://localhost:${PORT}`);
});
