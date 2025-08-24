// middleware/roleAuth.js
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Please authenticate.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

export const authorizeProviderAccess = async (req, res, next) => {
  try {
    const { user } = req;
    const { id } = req.params;

    if (user.role === 'admin') {
      return next();
    }

    // Check if user owns the photographer/videographer profile
    const Model = user.role === 'photographer' ? 
      (await import('../models/Photographer.js')).default : 
      (await import('../models/Videographer.js')).default;

    const profile = await Model.findOne({ user: id });

    if (!profile) {
      return res.status(403).json({ 
        message: 'Access denied. You can only modify your own profile.' 
      });
    }

    req.profile = profile;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
