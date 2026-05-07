const express = require("express");
const path = require("path");
const env = require("./src/config/env");

const availabilityRoutes = require("./src/routes/availabilityRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const contractRoutes = require("./src/routes/contractRoutes");
const { hostAuth, isHostAuthenticated, createHostToken } = require("./src/middleware/hostAuth");

const app = express();

app.use("/api/payments", paymentRoutes);
app.use(express.json());

// Pour le login host (form HTML)
app.use(express.urlencoded({ extended: false }));

app.get("/host/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "host-login.html"));
});

app.post("/host/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === env.hostBasicUser && password === env.hostBasicPass) {
    const token = createHostToken(username);
    const maxAgeSeconds = Math.floor(env.hostSessionTtlMs / 1000);
    const cookie = `${encodeURIComponent(env.hostCookieName)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
    res.setHeader("Set-Cookie", cookie);
    return res.redirect("/host");
  }

  return res.redirect("/host/login?error=1");
});

app.get("/host/logout", (_req, res) => {
  const maxAgeSeconds = 0;
  const cookie = `${encodeURIComponent(env.hostCookieName)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
  res.setHeader("Set-Cookie", cookie);
  return res.redirect("/host/login");
});

app.get("/host", (req, res) => {
  if (!isHostAuthenticated(req)) return res.redirect("/host/login");
  return res.sendFile(path.join(__dirname, "public", "host.html"));
});

// Evite que l'hote puisse charger host.html/host.js directement via express.static
app.get("/host.html", hostAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "host.html"));
});

app.get("/host.js", hostAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "host.js"));
});

// Les fichiers publics (index, style, etc.) sont accessibles sans auth
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/contracts", contractRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
