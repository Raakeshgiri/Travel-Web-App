import express, { Router } from "express";
import {
  bookPackage,
  cancelBooking,
  createOrder,
  deleteBookingHistory,
  getAllBookings,
  getAllUserBookings,
  getCurrentBookings,
  getUserCurrentBookings,
  verifyPayment,
} from "../controllers/booking.controller.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`Booking Route - ${req.method} ${req.path}`);
  next();
});

// Razorpay routes
router.post("/create-order", requireSignIn, (req, res, next) => {
  console.log("Create Order Route Hit - Body:", req.body);
  createOrder(req, res, next);
});
router.post("/verify-payment", requireSignIn, verifyPayment);

// book package
router.post("/book-package/:packageId", requireSignIn, bookPackage);

//get all current bookings admin
router.get("/get-currentBookings", requireSignIn, isAdmin, getCurrentBookings);

//get all bookings admin
router.get("/get-allBookings", requireSignIn, isAdmin, getAllBookings);

//get all current bookings by user id
router.get(
  "/get-UserCurrentBookings/:id",
  requireSignIn,
  getUserCurrentBookings
);

//get all bookings by user id
router.get("/get-allUserBookings/:id", requireSignIn, getAllUserBookings);

//delete history of booking
router.delete(
  "/delete-booking-history/:id/:userId",
  requireSignIn,
  deleteBookingHistory
);

//cancle booking by id
router.post("/cancel-booking/:id/:userId", requireSignIn, cancelBooking);

export default router;
