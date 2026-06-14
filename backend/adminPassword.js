const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function updateAdminPassword() {
  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash("NewPassword123", 10);

  await User.updateOne(
    { email: "admin@parkify.com" },
    { $set: { passwordHash: hashedPassword } }
  );

  console.log("Admin password updated successfully");
  process.exit();
}

updateAdminPassword();