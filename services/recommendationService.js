// services/recommendationService.js
import {
  getPersonalizedRecommendations,
  getSimilarProviders,
  getTrendingProviders,
  getCollaborativeRecommendations,
  getPopularProviders
} from '../utils/recommendations.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import cron from 'cron';

// Cache for storing computed recommendations
const recommendationCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Generate and cache recommendations for all users
export const generateRecommendationsForAllUsers = async () => {
  try {
    console.log('Starting batch recommendation generation...');
    
    const users = await User.find({
      role: 'user',
      isActive: true
    }).select('_id preferences');

    let processed = 0;
    const batchSize = 10;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const promises = batch.map(async (user) => {
        try {
          const recommendations = await getPersonalizedRecommendations(user._id, {
            limit: 20
          });
          
          // Cache the recommendations
          recommendationCache.set(`user_${user._id}`, {
            data: recommendations,
            timestamp: Date.now()
          });
          
          return true;
        } catch (error) {
          console.error(`Failed to generate recommendations for user ${user._id}:`, error);
          return false;
        }
      });
      
      await Promise.all(promises);
      processed += batch.length;
      
      console.log(`Processed ${processed}/${users.length} users`);
    }
    
    console.log('Batch recommendation generation completed');
  } catch (error) {
    console.error('Batch recommendation generation failed:', error);
  }
};

// Get recommendations with caching
export const getCachedRecommendations = async (userId, options = {}) => {
  const cacheKey = `user_${userId}`;
  const cached = recommendationCache.get(cacheKey);
  
  // Check if cache is valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  // Generate new recommendations
  const recommendations = await getPersonalizedRecommendations(userId, options);
  
  // Cache the results
  recommendationCache.set(cacheKey, {
    data: recommendations,
    timestamp: Date.now()
  });
  
  return recommendations;
};

// Update recommendations when user behavior changes
export const updateUserRecommendations = async (userId, trigger = 'unknown') => {
  try {
    console.log(`Updating recommendations for user ${userId} due to: ${trigger}`);
    
    // Remove from cache to force regeneration
    recommendationCache.delete(`user_${userId}`);
    
    // Generate new recommendations
    const recommendations = await getPersonalizedRecommendations(userId, {
      limit: 20
    });
    
    // Cache the new recommendations
    recommendationCache.set(`user_${userId}`, {
      data: recommendations,
      timestamp: Date.now()
    });
    
    return recommendations;
  } catch (error) {
    console.error(`Failed to update recommendations for user ${userId}:`, error);
    throw error;
  }
};

// Get diverse recommendation mix for homepage
export const getHomepageRecommendations = async (userId = null) => {
  try {
    const recommendations = {
      personalized: [],
      trending: [],
      popular: [],
      photographers: [],
      videographers: []
    };

    // Get personalized recommendations if user is logged in
    if (userId) {
      try {
        const personalizedRecs = await getCachedRecommendations(userId, { limit: 8 });
        recommendations.personalized = personalizedRecs.recommendations || [];
      } catch (error) {
        console.error('Failed to get personalized recommendations:', error);
      }
    }

    // Get trending providers
    try {
      recommendations.trending = await getTrendingProviders({ limit: 6, period: 7 });
    } catch (error) {
      console.error('Failed to get trending providers:', error);
    }

    // Get popular providers
    try {
      recommendations.popular = await getPopularProviders({ limit: 8 });
    } catch (error) {
      console.error('Failed to get popular providers:', error);
    }

    // Get top photographers
    try {
      recommendations.photographers = await getPopularProviders({
        limit: 6,
        providerType: 'Photographer'
      });
    } catch (error) {
      console.error('Failed to get popular photographers:', error);
    }

    // Get top videographers
    try {
      recommendations.videographers = await getPopularProviders({
        limit: 6,
        providerType: 'Videographer'
      });
    } catch (error) {
      console.error('Failed to get popular videographers:', error);
    }

    return recommendations;
  } catch (error) {
    console.error('Failed to get homepage recommendations:', error);
    throw error;
  }
};

// Get recommendations for provider detail page
export const getProviderPageRecommendations = async (providerId, providerType) => {
  try {
    const recommendations = {
      similar: [],
      trending: [],
      popular: []
    };

    // Get similar providers
    try {
      recommendations.similar = await getSimilarProviders(providerId, providerType, {
        limit: 6
      });
    } catch (error) {
      console.error('Failed to get similar providers:', error);
    }

    // Get trending providers of same type
    try {
      recommendations.trending = await getTrendingProviders({
        limit: 4,
        providerType,
        period: 14
      });
    } catch (error) {
      console.error('Failed to get trending providers:', error);
    }

    // Get popular providers of same type
    try {
      recommendations.popular = await getPopularProviders({
        limit: 4,
        providerType
      });
    } catch (error) {
      console.error('Failed to get popular providers:', error);
    }

    return recommendations;
  } catch (error) {
    console.error('Failed to get provider page recommendations:', error);
    throw error;
  }
};

// Track user interactions for improving recommendations
export const trackUserInteraction = async (userId, interaction) => {
  try {
    const {
      type, // 'view', 'book', 'favorite', 'contact'
      providerId,
      providerType,
      metadata = {}
    } = interaction;

    // Store interaction data (you might want to create a separate collection for this)
    console.log(`User ${userId} performed ${type} on ${providerType} ${providerId}`);

    // Update recommendations if significant interaction
    if (['book', 'favorite'].includes(type)) {
      // Debounce updates to avoid too frequent regeneration
      setTimeout(() => {
        updateUserRecommendations(userId, `user_${type}`);
      }, 5000); // 5 second delay
    }

    return true;
  } catch (error) {
    console.error('Failed to track user interaction:', error);
    return false;
  }
};

// Get recommendation analytics
export const getRecommendationAnalytics = async (period = '30d') => {
  try {
    const cutoffDate = new Date();
    const days = parseInt(period.replace('d', '')) || 30;
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get booking data influenced by recommendations
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // Cache performance
    const cacheStats = {
      totalCached: recommendationCache.size,
      cacheHitRate: 0, // Would need to implement hit tracking
      avgGenerationTime: 0 // Would need to implement timing
    };

    return {
      period,
      bookingStats: bookingStats[0] || { totalBookings: 0, totalRevenue: 0 },
      cacheStats,
      lastBatchUpdate: null // Would store in database
    };
  } catch (error) {
    console.error('Failed to get recommendation analytics:', error);
    throw error;
  }
};

// Clean expired cache entries
const cleanCache = () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of recommendationCache) {
    if (now - value.timestamp > CACHE_TTL) {
      recommendationCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired recommendation cache entries`);
  }
};

// Initialize scheduled jobs
export const initializeRecommendationJobs = () => {
  // Daily batch recommendation generation (runs at 2 AM)
  const batchJob = new cron.CronJob('0 2 * * *', generateRecommendationsForAllUsers);
  batchJob.start();
  
  // Cache cleanup every 6 hours
  const cleanupJob = new cron.CronJob('0 */6 * * *', cleanCache);
  cleanupJob.start();
  
  console.log('Recommendation service jobs initialized');
};

// Get A/B testing variants for recommendations
export const getRecommendationVariant = (userId) => {
  // Simple A/B test based on user ID
  const userIdNumber = parseInt(userId.slice(-1), 16) || 0;
  
  if (userIdNumber % 3 === 0) {
    return 'collaborative'; // Use collaborative filtering
  } else if (userIdNumber % 3 === 1) {
    return 'content-based'; // Use content-based filtering
  } else {
    return 'hybrid'; // Use hybrid approach
  }
};

// Get recommendations based on A/B test variant
export const getVariantRecommendations = async (userId, options = {}) => {
  const variant = getRecommendationVariant(userId);
  
  switch (variant) {
    case 'collaborative':
      return await getCollaborativeRecommendations(userId, options);
    case 'content-based':
      return await getPersonalizedRecommendations(userId, options);
    case 'hybrid':
    default:
      // Combine both approaches
      const [personalizedRecs, collaborativeRecs] = await Promise.all([
        getPersonalizedRecommendations(userId, { ...options, limit: Math.ceil(options.limit / 2) }),
        getCollaborativeRecommendations(userId, { ...options, limit: Math.floor(options.limit / 2) })
      ]);
      
      return {
        recommendations: [
          ...(personalizedRecs.recommendations || []),
          ...(collaborativeRecs || [])
        ].slice(0, options.limit),
        userPreferences: personalizedRecs.userPreferences,
        variant: 'hybrid'
      };
  }
};

export default {
  generateRecommendationsForAllUsers,
  getCachedRecommendations,
  updateUserRecommendations,
  getHomepageRecommendations,
  getProviderPageRecommendations,
  trackUserInteraction,
  getRecommendationAnalytics,
  initializeRecommendationJobs,
  getVariantRecommendations
};
