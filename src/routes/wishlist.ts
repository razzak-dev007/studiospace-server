import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getWishlistCollection, getStudiosCollection } from '../db.js';
import { verifyAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/wishlist - Get list of studio IDs or full studio objects saved by user
router.get('/', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const wishlistCol = getWishlistCollection();
    const items = await wishlistCol.find({ userEmail }).toArray();
    const studioIds = items.map(item => item.studioId);

    const studiosCol = getStudiosCollection();
    const objectIds = studioIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const studios = await studiosCol.find({ _id: { $in: objectIds } }).toArray();

    return res.json({
      success: true,
      studioIds,
      studios,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
  }
});

// POST /api/wishlist/toggle - Toggle wishlist status for a studio
router.post('/toggle', verifyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { studioId } = req.body;
    const userEmail = req.user?.email;

    if (!userEmail || !studioId) {
      return res.status(400).json({ success: false, message: 'Studio ID is required.' });
    }

    const wishlistCol = getWishlistCollection();
    const existing = await wishlistCol.findOne({ userEmail, studioId });

    if (existing) {
      await wishlistCol.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        saved: false,
        message: 'Studio removed from your saved wishlist.',
      });
    } else {
      await wishlistCol.insertOne({
        userEmail,
        studioId,
        createdAt: new Date(),
      });
      return res.json({
        success: true,
        saved: true,
        message: 'Studio added to your saved wishlist!',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to toggle wishlist' });
  }
});

export default router;
