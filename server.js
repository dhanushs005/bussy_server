import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client with Service Role Key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/update", async (req, res) => {
  console.log("📩 Incoming update:", req.body);

  let { busId, password, lat, lng } = req.body;

  // Ensure busId is string and trim spaces
  if (typeof busId === "number") busId = busId.toString();
  if (typeof busId === "string") busId = busId.trim();

  // Validate inputs
  if (!busId || !password || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Missing required fields!" });
  }

  try {
    // 1. Check if bus exists
    const { data: bus, error: busError } = await supabase
      .from("buses")
      .select("password")
      .eq("id", busId)
      .maybeSingle();

    if (busError) throw busError;

    if (!bus) {
      console.log(`🆕 Bus ${busId} not found — creating it...`);
      const { error: insertBusError } = await supabase
        .from("buses")
        .insert({ id: busId, password });

      if (insertBusError) throw insertBusError;
    } else {
      // Verify password
      if (bus.password !== password) {
        return res.status(401).json({ error: "Invalid password!" });
      }
    }

    // 2. Update or insert location
    const { data: existingLocation, error: fetchError } = await supabase
      .from("locations")
      .select("id")
      .eq("bus_id", busId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let updateError;
    if (existingLocation) {
      ({ error: updateError } = await supabase
        .from("locations")
        .update({ lat, lng, timestamp: new Date() })
        .eq("bus_id", busId));
    } else {
      ({ error: updateError } = await supabase
        .from("locations")
        .insert({ bus_id: busId, lat, lng, timestamp: new Date() }));
    }

    if (updateError) throw updateError;

    console.log(`✅ Location updated for bus ${busId}`);
    res.json({ success: true, message: "Location updated" });
  } catch (err) {
    console.error("❌ Server error:", err.message || err);
    res.status(500).json({ error: "Internal server error!" });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "Backend is running 🚀" });
});

app.listen(process.env.PORT,() => {
  console.log(`✅ Server running at http://0.0.0.0:${process.env.PORT}`);
});
