const mongoose = require("mongoose");
require("dotenv").config();

const Admin = require("./models/Admin");

mongoose.connect(process.env.MONGO_URI)
.then(async () => {

  const admins = await Admin.find();
  console.log(admins);

  process.exit();

})
.catch(err => {
  console.log("Error:", err.message);
});