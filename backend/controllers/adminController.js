const express = require('express');
const router = express.Router();
const CustomTrip = require('../models/CustomTrip');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Create a new custom trip request
router.post('/custom-trips', async (req, res) => {
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
      message: 'Custom trip request submitted successfully',
      tripId: customTrip._id 
    });
    
  } catch (error) {
    console.error('Error submitting custom trip:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all custom trip requests (admin only)
router.get('/custom-trips', [auth, adminAuth], async (req, res) => {
  try {
    const customTrips = await CustomTrip.find().sort({ createdAt: -1 });
    res.json(customTrips);
  } catch (error) {
    console.error('Error fetching custom trips:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update custom trip status (admin only)
router.put('/custom-trips/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    const customTrip = await CustomTrip.findById(req.params.id);
    
    if (!customTrip) {
      return res.status(404).json({ message: 'Custom trip not found' });
    }
    
    customTrip.status = status || customTrip.status;
    customTrip.adminNotes = adminNotes || customTrip.adminNotes;
    customTrip.updatedAt = new Date();
    
    await customTrip.save();
    
    res.json({ message: 'Custom trip updated successfully', customTrip });
    
  } catch (error) {
    console.error('Error updating custom trip:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;