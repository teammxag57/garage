import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import garagemRouter from "../routes/garagem.js";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.get("/", (req, res) => res.status(200).send("API online"));
app.use("/garagem", garagemRouter);
app.use("/apps/garagem", garagemRouter); // Para compatibilidade com App Proxy

export default function handler(req, res) {
  // Remove o prefixo /api da URL
  if (req.url.startsWith('/api')) {
    req.url = req.url.substring(4);
  }
  
  if (!req.url || req.url === '') {
    req.url = '/';
  }
  
  return app(req, res);
}