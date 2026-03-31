import { Router } from "express";

export const createAuthRouter = (required: boolean) => {
  const router = Router();

  router.get("/status", (_req, res) => {
    res.json({ required });
  });

  return router;
};
