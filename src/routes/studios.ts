import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getStudiosCollection } from '../db.js';
import { verifyAuth, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { Studio } from '../types.js';

const router = Router();

// GET /api/studios - Fetch studios with search, category filter, sorting, and limit
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, minPrice, maxPrice, sort, limit } = req.query;
    const filter: any = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { location: { $regex: searchRegex } },
        { overview: { $regex: searchRegex } },
        { amenities: { $regex: searchRegex } },
      ];
    }

    if (minPrice || maxPrice) {
      filter.hourlyRate = {};
      if (minPrice) filter.hourlyRate.$gte = Number(minPrice);
      if (maxPrice) filter.hourlyRate.$lte = Number(maxPrice);
    }

    let sortObj: any = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { hourlyRate: 1 };
    else if (sort === 'price_desc') sortObj = { hourlyRate: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'capacity') sortObj = { maxCapacity: -1 };

    const studiosCol = getStudiosCollection();
    let query = studiosCol.find(filter).sort(sortObj);

    if (limit) {
      query = query.limit(Number(limit));
    }

    const studios = await query.toArray();

    return res.json({
      success: true,
      count: studios.length,
      studios,
    });
  } catch (error: any) {
    console.error('Error fetching studios:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch studios.',
    });
  }
});

// GET /api/studios/categories - List available studio categories with counts
router.get('/categories/meta', async (_req, res) => {
  try {
    const studiosCol = getStudiosCollection();
    const categories = [
      { name: 'Photo Studios', value: 'Photo Studio', icon: 'Camera', image: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=800&q=80', description: 'Cyc walls, daylight lofts & professional strobes' },
      { name: 'Sound Stages', value: 'Film Stage', icon: 'Film', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80', description: 'Cinema-grade lighting grids, green screens & high ceilings' },
      { name: 'Podcast Lounges', value: 'Podcast Lounge', icon: 'Mic', image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80', description: 'Acoustically tuned suites with Shure SM7B mics & 4K multi-cam' },
      { name: 'Music Suites', value: 'Music Suite', icon: 'Headphones', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80', description: 'Dolby Atmos monitoring, analog preamps & vocal isolation booths' },
      { name: 'Art Workshops', value: 'Art Workshop', icon: 'Palette', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80', description: 'Pottery wheels, easel stations & expansive industrial sunlight' },
    ];

    const counts = await studiosCol.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray();

    const categoryData = categories.map(cat => {
      const match = counts.find((c: any) => c._id === cat.value);
      return { ...cat, count: match ? match.count : 0 };
    });

    return res.json({ success: true, categories: categoryData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// GET /api/studios/user/my-listings - Fetch listings owned by logged-in user (Protected)
router.get('/user/my-listings', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const ownerEmail = req.user?.email;
    if (!ownerEmail) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const studiosCol = getStudiosCollection();
    const myListings = await studiosCol
      .find({ ownerEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      success: true,
      count: myListings.length,
      listings: myListings,
    });
  } catch (error: any) {
    console.error('Error fetching user listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your studio listings.',
    });
  }
});

// GET /api/studios/:id - Single studio details
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid studio ID format.' });
    }

    const studiosCol = getStudiosCollection();
    const studio = await studiosCol.findOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res.status(404).json({ success: false, message: 'Studio workspace not found.' });
    }

    return res.json({
      success: true,
      studio,
    });
  } catch (error: any) {
    console.error('Error fetching studio details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve studio details.',
    });
  }
});

// POST /api/studios - Add new studio (Protected by Challenge 1 verifyAuth)
router.post('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      image,
      gallery,
      amenities,
      overview,
    } = req.body;

    if (!title || !category || !hourlyRate || !location || !image || !overview) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory fields: Title, Category, Hourly Rate, Location, Image, and Overview.',
      });
    }

    const ownerEmail = req.user?.email || '';
    const ownerName = req.user?.name || 'Studio Host';

    const newStudio: Studio = {
      title: title.trim(),
      category,
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit || 0),
      maxCapacity: Number(maxCapacity || 10),
      location: location.trim(),
      image: image.trim(),
      gallery: Array.isArray(gallery) && gallery.length > 0 ? gallery : [image.trim()],
      amenities: Array.isArray(amenities) ? amenities : [],
      overview: overview.trim(),
      ownerEmail,
      ownerName,
      ownerPhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ownerEmail)}`,
      rating: 5.0,
      reviewCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const studiosCol = getStudiosCollection();
    const result = await studiosCol.insertOne(newStudio);

    return res.status(201).json({
      success: true,
      message: 'Studio listing created successfully!',
      studioId: result.insertedId,
      studio: { ...newStudio, _id: result.insertedId },
    });
  } catch (error: any) {
    console.error('Error creating studio:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create studio listing.',
    });
  }
});

// PUT /api/studios/:id - Update studio (Protected by Challenge 1 verifyAuth)
router.put('/:id', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid studio ID.' });
    }

    const studiosCol = getStudiosCollection();
    const existing = await studiosCol.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Studio listing not found.' });
    }

    // Ownership check
    if (existing.ownerEmail !== req.user?.email && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to update this studio listing.',
      });
    }

    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      image,
      gallery,
      amenities,
      overview,
    } = req.body;

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (title) updateFields.title = title.trim();
    if (category) updateFields.category = category;
    if (hourlyRate !== undefined) updateFields.hourlyRate = Number(hourlyRate);
    if (securityDeposit !== undefined) updateFields.securityDeposit = Number(securityDeposit);
    if (maxCapacity !== undefined) updateFields.maxCapacity = Number(maxCapacity);
    if (location) updateFields.location = location.trim();
    if (image) updateFields.image = image.trim();
    if (gallery) updateFields.gallery = Array.isArray(gallery) ? gallery : [gallery];
    if (amenities) updateFields.amenities = Array.isArray(amenities) ? amenities : [];
    if (overview) updateFields.overview = overview.trim();

    await studiosCol.updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    const updated = await studiosCol.findOne({ _id: new ObjectId(id) });

    return res.json({
      success: true,
      message: 'Studio listing updated successfully!',
      studio: updated,
    });
  } catch (error: any) {
    console.error('Error updating studio:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update studio listing.',
    });
  }
});

// DELETE /api/studios/:id - Delete studio (Protected by Challenge 1 verifyAuth)
router.delete('/:id', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid studio ID.' });
    }

    const studiosCol = getStudiosCollection();
    const existing = await studiosCol.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Studio listing not found.' });
    }

    // Ownership check
    if (existing.ownerEmail !== req.user?.email && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this studio listing.',
      });
    }

    await studiosCol.deleteOne({ _id: new ObjectId(id) });

    return res.json({
      success: true,
      message: 'Studio listing deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error deleting studio:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete studio listing.',
    });
  }
});

export default router;
