import express from "express";
import { prisma } from "@repo/db";

const app = express();
const PORT = 8000;

async function checkDB() {
  try {
    await prisma.$connect();
    console.log("✅ DB connected successfully");
  } catch (error) {
    console.error("❌ DB connection failed:", error);
    process.exit(1); // crash app if DB fails
  }
}

checkDB();

app.get("/", (req, res) => {
  res.send("API is running ");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});