import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(express.json());
app.use(
  cors({
    // Enable CORS for your frontend origin
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);


const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").split(" ")[1]; 
    if (!token) return res.status(401).json({ error: "Missing bearer token" });
    const { data, error } = await supabase.auth.getUser(token); 
    if (error || !data?.user) return res.status(401).json({ error: "Invalid token" });
    req.user = data.user; // Attach authenticated user
    next(); // Continue to handler
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" }); // Fallback on errors
  }
}

// Simple health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Protected: fetch current user's profile row from public.profiles
app.get("/api/me/profile", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

// Protected: update current user's profile row (keys provided in body)
app.put("/api/me/profile", requireAuth, async (req, res) => {
  const updates = req.body || {}; // Trust only fields sent
  const { error } = await supabase.from("profiles").update(updates).eq("id", req.user.id); // Ensure only own row
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Protected: permanently delete the current user's account
app.delete("/api/me/account", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user's id

    // Optional cleanup: delete profile row (service_role bypasses RLS)
    // If you set ON DELETE CASCADE on the FK, this becomes unnecessary.
    const { error: profileErr } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileErr) {
      console.warn("Profile delete warning:", profileErr.message); // Log but continue
    }

    // Optional cleanup: delete any user files in Storage (adjust to your buckets/paths)
    // await supabase.storage.from("avatars").remove([`${userId}/avatar.png`]);

    // Critical: delete Auth user (requires service_role key)
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("Auth delete error:", deleteErr.message);
      return res.status(500).json({ error: "Failed to delete auth user" });
    }

    // Done
    return res.json({ ok: true });
  } catch (err) {
    console.error("Delete account unexpected error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Start server on configured port
app.listen(process.env.PORT, () => {
  console.log(`API listening on http://localhost:${process.env.PORT}`);
});
