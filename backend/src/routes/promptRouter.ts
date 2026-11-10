import { Router } from "express";
import multer from "multer";
import * as PromptController from "../controllers/PromptController";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const promptRoutes = Router();

promptRoutes.get("/prompt", isAuth, PromptController.index);

promptRoutes.post("/prompt", isAuth, PromptController.store);

promptRoutes.post("/prompt/upload-pdf", isAuth, upload.single("file"), PromptController.uploadPdf);

promptRoutes.get("/prompt/:promptId", isAuth, PromptController.show);

promptRoutes.put("/prompt/:promptId", isAuth, PromptController.update);

promptRoutes.delete("/prompt/:promptId", isAuth, PromptController.remove);

export default promptRoutes;
