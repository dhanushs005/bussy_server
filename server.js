import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🛠 Update location for a bus
app.post("/update", async (req, res) => {
  const { busId, password, lat, lng } = req.body;

  if (!busId || !password || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Missing required fields!" });
  }

  try {
    // Check bus
    const { data: bus, error: busError } = await supabase
      .from("buses")
      .select("password")
      .eq("id", busId)
      .maybeSingle();

    if (busError) throw busError;
    if (!bus) return res.status(404).json({ error: "Bus not found!" });

    if (bus.password !== password) {
      return res.status(401).json({ error: "Invalid password!" });
    }

    // Update or insert location
    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("bus_id", busId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("locations")
        .update({ lat, lng, timestamp: new Date() })
        .eq("bus_id", busId));
    } else {
      ({ error } = await supabase
        .from("locations")
        .insert({ bus_id: busId, lat, lng, timestamp: new Date() }));
    }

    if (error) throw error;

    res.json({ success: true, message: "Location updated" });
  } catch (err) {
    console.error("❌ Update error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📍 Fetch all locations
app.get("/locations", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("bus_id, lat, lng, timestamp");

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("❌ Fetch error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀" });
});

app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
});
