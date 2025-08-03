import connectDB from "./config/db.js";
import dotenv from "dotenv";
import app from "./app.js";
dotenv.config({
  path: "./.env",
})

connectDB()
.then(()=>{
    const port = process.env.PORT || 6000
    app.listen(port,()=>{
      console.log("server is started and running at port",port)
    })
})
.catch((err)=>{
  console.log("MongoDB Connection failed!!!",err)
})