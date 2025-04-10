import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import CustomTrip from "../models/CustomTrip.js";

dotenv.config();

const router = express.Router();

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Create a new custom trip request
router.post('/', async (req, res) => {
  try {
    const { tourPlan, userDetails } = req.body;
    
    // Create a new custom trip request
    const customTrip = new CustomTrip({
      tourPlan,
      userDetails: userDetails || { name: 'Anonymous User' },
      status: 'pending',
      createdAt: new Date()
    });
    
    await customTrip.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Custom trip request submitted successfully',
      tripId: customTrip._id 
    });
    
  } catch (error) {
    console.error('Error submitting custom trip:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get all custom trip requests (admin only)
router.get('/', async (req, res) => {
  try {
    const customTrips = await CustomTrip.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: customTrips
    });
  } catch (error) {
    console.error('Error fetching custom trips:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Update custom trip status (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    const customTrip = await CustomTrip.findById(req.params.id);
    
    if (!customTrip) {
      return res.status(404).json({ 
        success: false,
        message: 'Custom trip not found' 
      });
    }
    
    const oldStatus = customTrip.status;
    customTrip.status = status || customTrip.status;
    customTrip.adminNotes = adminNotes || customTrip.adminNotes;
    customTrip.updatedAt = new Date();
    
    await customTrip.save();

    // Send email notification if status changed and user has an email
    if (oldStatus !== status && customTrip.userDetails.email) {
      const subject = status === 'approved' 
        ? 'Your Custom Trip Plan Has Been Approved!' 
        : 'Update on Your Custom Trip Plan';
      
      const message = status === 'approved'
        ? `Dear ${customTrip.userDetails.name},\n\nWe are pleased to inform you that your custom trip plan for ${customTrip.tourPlan.destination} has been approved! Our team will contact you shortly to discuss the next steps.\n\nBest regards,\nTravel Mate`
        : `Dear ${customTrip.userDetails.name},\n\nWe regret to inform you that your custom trip plan for ${customTrip.tourPlan.destination} has been ${status}. ${adminNotes ? `\n\nAdmin Notes: ${adminNotes}` : ''}\n\nIf you have any questions, please feel free to contact us.\n\nBest regards,\nTravel Mate`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customTrip.userDetails.email,
        subject: subject,
        text: message
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Status update email sent successfully');
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Custom trip updated successfully',
      customTrip 
    });
    
  } catch (error) {
    console.error('Error updating custom trip:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default router;