import express from "express";
import garagemRouter from "../routes/garagem.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/garagem", garagemRouter);

// Catch-all handler para o Vercel
export default function handler(req, res) {
  return app(req, res);
}
