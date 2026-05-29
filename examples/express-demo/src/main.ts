import { anyFormat } from "any-shape";
import bodyParser from "body-parser";
import express from "express";
import { User, userSchema } from "./userSchema.js";

const app = express();
app.use(bodyParser.json());

app.post(
  "/user",
  anyFormat(userSchema, { skipVerification: true }),
  (req, res) => {
    const user = req.body as User;
    res.json(user);
  },
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(
    `Using AI provider: ${process.env.AI_PROVIDER} and model: ${process.env.AI_MODEL}`,
  );
  console.log(`express-demo listening on http://localhost:${port}`);
});
