import Booking from "../models/booking.model.js";
import Package from "../models/package.model.js";
import { ObjectId } from "mongodb";
import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || "rzp_test_7qBV4Q0u3dqJ57",
  key_secret: process.env.RAZORPAY_SECRET
});

// Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required"
      });
    }

    console.log("Creating order for amount:", amount);
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise and ensure it's an integer
      currency: "INR",
      receipt: "order_" + Date.now(),
    };

    console.log("Order options:", options);

    const order = await razorpay.orders.create(options);
    console.log("Order created:", order);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create order"
    });
  }
};

// Verify Razorpay payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      res.status(200).json({
        success: true,
        message: "Payment verified successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
};

//book package
export const bookPackage = async (req, res) => {
  try {
    const { packageDetails, buyer, totalPrice, persons, date } = req.body;

    if (req.user.id !== buyer) {
      return res.status(401).send({
        success: false,
        message: "You can only buy on your account!",
      });
    }

    if (!packageDetails || !buyer || !totalPrice || !persons || !date) {
      return res.status(200).send({
        success: false,
        message: "All fields are required!",
      });
    }

    const validPackage = await Package.findById(packageDetails);

    if (!validPackage) {
      return res.status(404).send({
        success: false,
        message: "Package Not Found!",
      });
    }

    const newBooking = await Booking.create(req.body);

    if (newBooking) {
      return res.status(201).send({
        success: true,
        message: "Package Booked!",
      });
    } else {
      return res.status(500).send({
        success: false,
        message: "Something went wrong!",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

//get current bookings for admin
export const getCurrentBookings = async (req, res) => {
  try {
    const searchTerm = req?.query?.searchTerm || "";
    const bookings = await Booking.find({
      date: { $gt: new Date().toISOString() },
      status: "Booked",
    })
      .populate("packageDetails")
      // .populate("buyer", "username email")
      .populate({
        path: "buyer",
        match: {
          $or: [
            { username: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
          ],
        },
      })
      .sort({ createdAt: "asc" });
    let bookingsFilterd = [];
    bookings.map((booking) => {
      if (booking.buyer !== null) {
        bookingsFilterd.push(booking);
      }
    });
    if (bookingsFilterd.length) {
      return res.status(200).send({
        success: true,
        bookings: bookingsFilterd,
      });
    } else {
      return res.status(200).send({
        success: false,
        message: "No Bookings Available",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

//get all bookings admin
export const getAllBookings = async (req, res) => {
  try {
    const searchTerm = req?.query?.searchTerm || "";
    const bookings = await Booking.find({})
      .populate("packageDetails")
      // .populate("buyer", "username email")
      .populate({
        path: "buyer",
        match: {
          $or: [
            { username: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
          ],
        },
      })
      .sort({ createdAt: "asc" });
    let bookingsFilterd = [];
    bookings.map((booking) => {
      if (booking.buyer !== null) {
        bookingsFilterd.push(booking);
      }
    });
    if (bookingsFilterd.length) {
      return res.status(200).send({
        success: true,
        bookings: bookingsFilterd,
      });
    } else {
      return res.status(200).send({
        success: false,
        message: "No Bookings Available",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

//get current bookings for user by id
export const getUserCurrentBookings = async (req, res) => {
  try {
    if (req?.user?.id !== req?.params?.id) {
      return res.status(401).send({
        success: false,
        message: "You can only get your own bookings!!",
      });
    }
    const searchTerm = req?.query?.searchTerm || "";
    const bookings = await Booking.find({
      buyer: new ObjectId(req?.params?.id),
      date: { $gt: new Date().toISOString() },
      status: "Booked",
    })
      // .populate("packageDetails")
      .populate({
        path: "packageDetails",
        match: {
          packageName: { $regex: searchTerm, $options: "i" },
        },
      })
      .populate("buyer", "username email")
      .sort({ createdAt: "asc" });
    let bookingsFilterd = [];
    bookings.map((booking) => {
      if (booking.packageDetails !== null) {
        bookingsFilterd.push(booking);
      }
    });
    if (bookingsFilterd.length) {
      return res.status(200).send({
        success: true,
        bookings: bookingsFilterd,
      });
    } else {
      return res.status(200).send({
        success: false,
        message: "No Bookings Available",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

//get all bookings by user id
export const getAllUserBookings = async (req, res) => {
  try {
    if (req?.user?.id !== req?.params?.id) {
      return res.status(401).send({
        success: false,
        message: "You can only get your own bookings!!",
      });
    }
    const searchTerm = req?.query?.searchTerm || "";
    const bookings = await Booking.find({
      buyer: new ObjectId(req?.params?.id),
    })
      // .populate("packageDetails")
      .populate({
        path: "packageDetails",
        match: {
          packageName: { $regex: searchTerm, $options: "i" },
        },
      })
      .populate("buyer", "username email")
      .sort({ createdAt: "asc" });
    let bookingsFilterd = [];
    bookings.map((booking) => {
      if (booking.packageDetails !== null) {
        bookingsFilterd.push(booking);
      }
    });
    if (bookingsFilterd.length) {
      return res.status(200).send({
        success: true,
        bookings: bookingsFilterd,
      });
    } else {
      return res.status(200).send({
        success: false,
        message: "No Bookings Available",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

//delete booking history
export const deleteBookingHistory = async (req, res) => {
  try {
    if (req?.user?.id !== req?.params?.userId) {
      return res.status(401).send({
        success: false,
        message: "You can only delete your booking history!",
      });
    }
    const deleteHistory = await Booking.findByIdAndDelete(req?.params?.id);
    if (deleteHistory) {
      return res.status(200).send({
        success: true,
        message: "Booking History Deleted!",
      });
    } else {
      return res.status(500).send({
        success: false,
        message: "Something went wrong while deleting booking history!",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

//cancel booking
export const cancelBooking = async (req, res) => {
  try {
    if (req.user.id !== req?.params?.userId) {
      return res.status(401).send({
        success: false,
        message: "You can only cancel your bookings!",
      });
    }
    const cancBooking = await Booking.findByIdAndUpdate(
      req?.params?.id,
      {
        status: "Cancelled",
      },
      { new: true }
    );
    if (cancBooking) {
      return res.status(200).send({
        success: true,
        message: "Booking Cancelled!",
      });
    } else {
      return res.status(500).send({
        success: false,
        message: "Something went wrong while cancelling booking!",
      });
    }
  } catch (error) {
    console.log(error);
  }
};
