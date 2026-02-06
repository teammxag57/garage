import express from "express";
import garagemRouter from "../routes/garagem.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.get("/", (req, res) => res.status(200).send("API online"));
app.use("/garagem", garagemRouter);

export default function handler(req, res) {
  // Remove prefixo /api se existir
  const path = req.url.replace(/^\/api/, '') || '/';
  req.url = path;
  
  return app(req, res);
}