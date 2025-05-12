const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mongoUri =
  process.env.MONGO_URI ;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose
  .connect(mongoUri) //, options)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.on("disconnected", () => console.log("MongoDB disconnected"));
db.on("reconnected", () => console.log("MongoDB reconnected"));

module.exports = db;
