import DeactivatedMatch from '../../models/matchSettingsModel.js';
import { broadcastMatchVisibilityUpdate } from '../../socket/bettingSocket.js';
import { collectDownlineIds } from '../../utils/deactivatedMatches.js';

// Toggle Match Status for THIS admin only (affects their downline, not upline)
export const toggleMatchStatus = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { sport, matchName } = req.body;

    if (!matchId || !sport || !matchName) {
      return res.status(400).json({ message: 'All field are required' });
    }
    if (
      sport != 'cricket' &&
      sport != 'tennis' &&
      sport != 'soccer' &&
      sport != 'horse-racing'
    ) {
      return res.status(400).json({ message: 'Invalid sport' });
    }

    if (!req.role || req.role === 'user' || !req.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change match status',
      });
    }

    const adminId = req.id;
    const existing = await DeactivatedMatch.findOne({
      matchId: String(matchId),
      deactivateBy: adminId,
    });

    let isActive;
    if (existing) {
      await DeactivatedMatch.deleteOne({ _id: existing._id });
      isActive = true;
    } else {
      await DeactivatedMatch.create({
        matchId: String(matchId),
        sport,
        matchName,
        deactivateBy: adminId,
      });
      isActive = false;
    }

    const targetUserIds = await collectDownlineIds(adminId);
    broadcastMatchVisibilityUpdate({
      matchId,
      sport,
      matchName,
      isActive,
      targetUserIds,
    });

    return res.status(200).json({
      success: true,
      message: isActive
        ? 'Match activated successfully'
        : 'Match deactivated successfully',
      data: {
        matchId,
        isActive,
      },
    });
  } catch (error) {
    console.error('Error in toggleMatchStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Deactivated matches for the logged-in admin only (own hides)
export const getDeactivatedMatches = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = { deactivateBy: req.id };
    const deactivatedMatches = await DeactivatedMatch.find(filter)
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      message: 'Deactivated matches fetched successfully',
      data: {
        matches: deactivatedMatches,
      },
    });
  } catch (error) {
    console.error('Error in getDeactivatedMatches:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Check if a specific match is hidden by THIS admin
export const checkMatchStatus = async (req, res) => {
  try {
    const { matchId } = req.params;
    const deactivatedMatch = await DeactivatedMatch.findOne({
      matchId: String(matchId),
      deactivateBy: req.id,
    });
    return res.status(200).json({
      success: true,
      message: deactivatedMatch ? 'Match is deactivated' : 'Match is active',
      data: {
        matchId,
        isActive: !deactivatedMatch,
      },
    });
  } catch (error) {
    console.error('Error in checkMatchStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
