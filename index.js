import express from "express";
import mysql from "mysql";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "transportdb",
});

db.connect((err) => {
  if (err) {
    console.log("DB connection error:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// ================= Routes ==================

// Signup
app.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body;
  const q = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";
  db.query(q, [name, email, password, role || "user"], (err, result) => {
    if (err) return res.json({ success: false, message: err });
    res.json({ success: true, message: "User registered!" });
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const q = "SELECT * FROM users WHERE email=? AND password=?";
  db.query(q, [email, password], (err, results) => {
    if (err) return res.json({ success: false, message: err });
    if (results.length > 0) {
      res.json({
        success: true,
        userId: results[0].id,
        role: results[0].role,
      });
    } else {
      res.json({ success: false, message: "Invalid email or password" });
    }
  });
});

// Get all buses
app.get("/buses", (req, res) => {
  const q = "SELECT * FROM buses";
  db.query(q, (err, results) => {
    if (err) return res.json({ success: false, message: err });
    res.json(results);
  });
});

// Book a bus
app.post("/bookbus", (req, res) => {
  const { user_id, bus_id, seats_booked } = req.body;

  // 1. Check seats availability
  const q1 = "SELECT seats_available FROM buses WHERE id=?";
  db.query(q1, [bus_id], (err, results) => {
    if (err) return res.json({ success: false, message: err });
    if (results.length === 0) return res.json({ success: false, message: "Bus not found" });
    if (results[0].seats_available < seats_booked)
      return res.json({ success: false, message: "Not enough seats" });

    // 2. Insert booking
    const q2 = "INSERT INTO bookings (user_id, bus_id, seats_booked) VALUES (?, ?, ?)";
    db.query(q2, [user_id, bus_id, seats_booked], (err2, result2) => {
      if (err2) return res.json({ success: false, message: err2 });

      // 3. Update available seats
      const q3 = "UPDATE buses SET seats_available = seats_available - ? WHERE id=?";
      db.query(q3, [seats_booked, bus_id], (err3) => {
        if (err3) return res.json({ success: false, message: err3 });
        res.json({ success: true, message: "Booking successful" });
      });
    });
  });
});

// Get all bookings (admin)
app.get("/bookings", (req, res) => {
  const q = `
    SELECT b.id, u.name as user_name, u.email as user_email, 
           bus.bus_number, bus.origin, bus.destination, bus.date, bus.time, b.seats_booked
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN buses bus ON b.bus_id = bus.id
  `;
  db.query(q, (err, results) => {
    if (err) return res.json({ success: false, message: err });
    res.json(results);
  });
});

// Delete booking (admin)
app.delete("/bookings/:id", (req, res) => {
  const { id } = req.params;
  const q = "DELETE FROM bookings WHERE id=?";
  db.query(q, [id], (err) => {
    if (err) return res.json({ success: false, message: err });
    res.json({ success: true, message: "Booking deleted" });
  });
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
