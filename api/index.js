import express from "express";
import garagemRouter from "../routes/garagem.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Method:', req.method);
  console.log('Original URL:', req.originalUrl);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  next();
});

// Rotas
app.get("/", (req, res) => res.status(200).send("API online"));
app.use("/garagem", garagemRouter);

export default function handler(req, res) {
  // Remove o prefixo /api da URL
  if (req.url.startsWith('/api')) {
    req.url = req.url.substring(4); // remove '/api'
  }
  
  // Se ficar vazio, define como '/'
  if (!req.url || req.url === '') {
    req.url = '/';
  }
  
  return app(req, res);
}