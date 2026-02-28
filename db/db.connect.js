const mongoose = require("mongoose");
const mongoUri = process.env.MONGOURI;
const initializeDb = async (params) => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Error while connecting db", error);
    process.exit(1);
  }
};
module.exports = { initializeDb };
