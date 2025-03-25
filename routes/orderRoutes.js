import express from 'express'
import { getOrders } from "../controllers/orderController.js";
import {protect, isAdmin} from "../middleware/authMiddleware.js"

const router = express.Router()

router.get('/', protect, isAdmin, getOrders)

export default router