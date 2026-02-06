import express from "express";
import garagemRouter from "../routes/garagem.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Se a tua rota atual é /toggle e /list dentro do router:
app.use("/garagem", garagemRouter);

export default app;
