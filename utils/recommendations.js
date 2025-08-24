// utils/recommendations.js
import Photographer from '../models/Photographer.js';
import Videographer from '../models/Videographer.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Calculate similarity score between two arrays (specializations, preferences)
const calculateSimilarity = (arr1, arr2) => {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;
  
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
};

// Calculate distance between two coordinates
const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2 || !coord1.latitude || !coord2.latitude) return Infinity;
  
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get personalized recommendations for a user
export const getPersonalizedRecommendations = async (userId, options = {}) => {
  try {
    const {
      limit = 10,
      providerType = null, // 'Photographer' or 'Videographer' or null for both
      eventType = null,
      location = null,
      budget = null
    } = options;

    // Get user's preferences and booking history
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get user's booking history to understand preferences
    const userBookings = await Booking.find({
      client: userId,
      status: { $in: ['completed', 'confirmed'] }
    }).populate('provider');

    // Get user's reviews to understand satisfaction patterns
    const userReviews = await Review.find({ client: userId });

    // Extract user preferences from history
    const preferredSpecializations = [];
    const preferredLocations = [];
    const budgetRange = { min: 0, max: Infinity };
    const positiveProviders = new Set();

    userBookings.forEach(booking => {
      if (booking.provider && booking.provider.specializations) {
        preferredSpecializations.push(...booking.provider.specializations);
      }
      if (booking.eventDetails.location.city) {
        preferredLocations.push(booking.eventDetails.location.city);
      }
      if (booking.pricing.totalAmount) {
        budgetRange.min = Math.min(budgetRange.min, booking.pricing.totalAmount);
        budgetRange.max = Math.max(budgetRange.max, booking.pricing.totalAmount);
      }
    });

    // Identify providers with high ratings from user
    userReviews.forEach(review => {
      if (review.ratings.overall >= 4) {
        positiveProviders.add(review.provider.toString());
      }
    });

    // Combine with explicit user preferences
    const combinedPreferences = [
      ...preferredSpecializations,
      ...(user.preferences?.preferredCategories || [])
    ];

    // Build query for providers
    const providerQueries = [];
    
    if (!providerType || providerType === 'Photographer') {
      providerQueries.push(
        Photographer.find({
          isActive: true,
          isApproved: true
        }).populate('user', 'name avatar')
      );
    }
    
    if (!providerType || providerType === 'Videographer') {
      providerQueries.push(
        Videographer.find({
          isActive: true,
          isApproved: true
        }).populate('user', 'name avatar')
      );
    }

    const providerResults = await Promise.all(providerQueries);
    const allProviders = providerResults.flat();

    // Score each provider
    const scoredProviders = allProviders.map(provider => {
      let score = 0;
      let factors = {};

      // Base score from ratings
      const ratingScore = provider.ratings.average / 5;
      score += ratingScore * 0.3;
      factors.rating = ratingScore;

      // Specialization match
      const specializationScore = calculateSimilarity(
        provider.specializations,
        combinedPreferences
      );
      score += specializationScore * 0.25;
      factors.specialization = specializationScore;

      // Location preference
      let locationScore = 0;
      if (location && provider.location.coordinates) {
        const distance = calculateDistance(location, provider.location.coordinates);
        locationScore = Math.max(0, 1 - distance / 100); // Prefer within 100km
      } else if (preferredLocations.includes(provider.location.city)) {
        locationScore = 1;
      }
      score += locationScore * 0.15;
      factors.location = locationScore;

      // Budget compatibility
      let budgetScore = 0;
      if (budget || budgetRange.max !== Infinity) {
        const targetBudget = budget || (budgetRange.min + budgetRange.max) / 2;
        const providerPrice = provider.pricing.hourly || provider.pricing.halfDay || 0;
        if (providerPrice > 0) {
          const priceDiff = Math.abs(targetBudget - providerPrice) / targetBudget;
          budgetScore = Math.max(0, 1 - priceDiff);
        }
      }
      score += budgetScore * 0.1;
      factors.budget = budgetScore;

      // Experience factor
      const experienceScore = Math.min(provider.experience / 10, 1); // Normalize to 0-1
      score += experienceScore * 0.1;
      factors.experience = experienceScore;

      // Popularity factor (views and bookings)
      const popularityScore = Math.min(provider.analytics.profileViews / 1000, 1);
      score += popularityScore * 0.05;
      factors.popularity = popularityScore;

      // Previous positive experience bonus
      if (positiveProviders.has(provider._id.toString())) {
        score += 0.05;
        factors.previousExperience = 0.05;
      }

      return {
        provider,
        score,
        factors,
        providerType: provider.constructor.modelName
      };
    });

    // Sort by score and return top results
    const recommendations = scoredProviders
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        ...item.provider.toObject(),
        recommendationScore: Math.round(item.score * 100),
        recommendationFactors: item.factors,
        providerType: item.providerType
      }));

    return {
      recommendations,
      userPreferences: {
        preferredSpecializations: [...new Set(combinedPreferences)],
        preferredLocations: [...new Set(preferredLocations)],
        budgetRange: budgetRange.max !== Infinity ? budgetRange : null
      }
    };
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    throw new Error('Failed to generate personalized recommendations');
  }
};

// Get similar providers based on a given provider
export const getSimilarProviders = async (providerId, providerType, options = {}) => {
  try {
    const { limit = 5 } = options;

    const ProviderModel = providerType === 'Photographer' ? Photographer : Videographer;
    const baseProvider = await ProviderModel.findById(providerId);
    
    if (!baseProvider) throw new Error('Provider not found');

    // Find other providers of the same type
    const otherProviders = await ProviderModel.find({
      _id: { $ne: providerId },
      isActive: true,
      isApproved: true
    }).populate('user', 'name avatar');

    // Score similarity
    const similarProviders = otherProviders.map(provider => {
      let similarityScore = 0;

      // Specialization similarity
      const specializationSim = calculateSimilarity(
        baseProvider.specializations,
        provider.specializations
      );
      similarityScore += specializationSim * 0.4;

      // Location similarity
      let locationSim = 0;
      if (baseProvider.location.city === provider.location.city) {
        locationSim = 1;
      } else if (baseProvider.location.state === provider.location.state) {
        locationSim = 0.5;
      }
      similarityScore += locationSim * 0.2;

      // Price similarity
      const basePricing = baseProvider.pricing.hourly || baseProvider.pricing.halfDay || 0;
      const providerPricing = provider.pricing.hourly || provider.pricing.halfDay || 0;
      let priceSim = 0;
      if (basePricing > 0 && providerPricing > 0) {
        const priceDiff = Math.abs(basePricing - providerPricing) / Math.max(basePricing, providerPricing);
        priceSim = 1 - priceDiff;
      }
      similarityScore += priceSim * 0.2;

      // Rating similarity
      const ratingDiff = Math.abs(baseProvider.ratings.average - provider.ratings.average);
      const ratingSim = 1 - (ratingDiff / 5);
      similarityScore += ratingSim * 0.1;

      // Experience similarity
      const expDiff = Math.abs(baseProvider.experience - provider.experience);
      const expSim = 1 - Math.min(expDiff / 10, 1);
      similarityScore += expSim * 0.1;

      return {
        provider,
        similarityScore
      };
    });

    // Sort by similarity and return top results
    const topSimilar = similarProviders
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit)
      .map(item => ({
        ...item.provider.toObject(),
        similarityScore: Math.round(item.similarityScore * 100)
      }));

    return topSimilar;
  } catch (error) {
    console.error('Similar providers error:', error);
    throw new Error('Failed to find similar providers');
  }
};

// Get trending providers based on recent activity
export const getTrendingProviders = async (options = {}) => {
  try {
    const {
      limit = 10,
      providerType = null,
      period = 7 // days
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);

    // Get recent booking activity
    const recentActivity = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            provider: '$provider',
            providerType: '$providerType'
          },
          recentBookings: { $sum: 1 },
          recentRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // Get recent reviews
    const recentReviews = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: {
            provider: '$provider',
            providerType: '$providerType'
          },
          recentReviews: { $sum: 1 },
          recentRating: { $avg: '$ratings.overall' }
        }
      }
    ]);

    // Combine activity data
    const activityMap = new Map();
    
    recentActivity.forEach(item => {
      const key = `${item._id.provider}_${item._id.providerType}`;
      activityMap.set(key, {
        providerId: item._id.provider,
        providerType: item._id.providerType,
        recentBookings: item.recentBookings,
        recentRevenue: item.recentRevenue,
        recentReviews: 0,
        recentRating: 0
      });
    });

    recentReviews.forEach(item => {
      const key = `${item._id.provider}_${item._id.providerType}`;
      const existing = activityMap.get(key) || {
        providerId: item._id.provider,
        providerType: item._id.providerType,
        recentBookings: 0,
        recentRevenue: 0,
        recentReviews: 0,
        recentRating: 0
      };
      
      existing.recentReviews = item.recentReviews;
      existing.recentRating = item.recentRating;
      activityMap.set(key, existing);
    });

    // Get provider details and calculate trending scores
    const trendingProviders = [];

    for (const [key, activity] of activityMap) {
      if (providerType && activity.providerType !== providerType) continue;

      const ProviderModel = activity.providerType === 'Photographer' ? Photographer : Videographer;
      const provider = await ProviderModel.findById(activity.providerId)
        .populate('user', 'name avatar');

      if (!provider || !provider.isActive || !provider.isApproved) continue;

      // Calculate trending score
      let trendingScore = 0;
      
      // Recent bookings weight
      trendingScore += activity.recentBookings * 0.4;
      
      // Recent reviews weight
      trendingScore += activity.recentReviews * 0.3;
      
      // Recent rating weight
      trendingScore += (activity.recentRating / 5) * 0.2;
      
      // Revenue momentum weight
      trendingScore += Math.min(activity.recentRevenue / 1000, 10) * 0.1;

      trendingProviders.push({
        ...provider.toObject(),
        trendingScore: Math.round(trendingScore * 100),
        recentActivity: activity,
        providerType: activity.providerType
      });
    }

    // Sort by trending score and return top results
    return trendingProviders
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

  } catch (error) {
    console.error('Trending providers error:', error);
    throw new Error('Failed to get trending providers');
  }
};

// Get providers based on collaborative filtering (users who booked X also booked Y)
export const getCollaborativeRecommendations = async (userId, options = {}) => {
  try {
    const { limit = 10, providerType = null } = options;

    // Get user's booking history
    const userBookings = await Booking.find({
      client: userId,
      status: { $in: ['completed', 'confirmed'] }
    });

    const userProviders = userBookings.map(booking => booking.provider.toString());

    if (userProviders.length === 0) {
      // No booking history, return popular providers
      return await getPopularProviders({ limit, providerType });
    }

    // Find users who booked similar providers
    const similarUsers = await Booking.aggregate([
      {
        $match: {
          provider: { $in: userBookings.map(b => b.provider) },
          client: { $ne: new mongoose.Types.ObjectId(userId) }
        }
      },
      {
        $group: {
          _id: '$client',
          commonProviders: { $addToSet: '$provider' },
          totalBookings: { $sum: 1 }
        }
      },
      {
        $addFields: {
          similarity: { $size: '$commonProviders' }
        }
      },
      {
        $sort: { similarity: -1, totalBookings: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // Get providers booked by similar users that current user hasn't booked
    const recommendedProviderIds = new Set();
    
    for (const similarUser of similarUsers) {
      const theirBookings = await Booking.find({
        client: similarUser._id,
        provider: { $nin: userProviders },
        status: { $in: ['completed', 'confirmed'] }
      }).limit(5);

      theirBookings.forEach(booking => {
        recommendedProviderIds.add(booking.provider.toString());
      });
    }

    if (recommendedProviderIds.size === 0) {
      return await getPopularProviders({ limit, providerType });
    }

    // Get provider details
    const providerQueries = [];
    
    if (!providerType || providerType === 'Photographer') {
      providerQueries.push(
        Photographer.find({
          _id: { $in: Array.from(recommendedProviderIds) },
          isActive: true,
          isApproved: true
        }).populate('user', 'name avatar')
      );
    }
    
    if (!providerType || providerType === 'Videographer') {
      providerQueries.push(
        Videographer.find({
          _id: { $in: Array.from(recommendedProviderIds) },
          isActive: true,
          isApproved: true
        }).populate('user', 'name avatar')
      );
    }

    const providerResults = await Promise.all(providerQueries);
    const recommendedProviders = providerResults.flat();

    // Score based on frequency of recommendation
    const scoredProviders = recommendedProviders.map(provider => {
      // Count how many similar users booked this provider
      let recommendationCount = 0;
      // This would require more complex querying, simplified for now
      
      return {
        ...provider.toObject(),
        recommendationScore: Math.round((provider.ratings.average / 5) * 100),
        providerType: provider.constructor.modelName
      };
    });

    return scoredProviders
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

  } catch (error) {
    console.error('Collaborative recommendations error:', error);
    throw new Error('Failed to generate collaborative recommendations');
  }
};

// Get popular providers based on overall metrics
export const getPopularProviders = async (options = {}) => {
  try {
    const {
      limit = 10,
      providerType = null,
      location = null,
      specialization = null
    } = options;

    const providerQueries = [];
    const baseQuery = {
      isActive: true,
      isApproved: true
    };

    if (location) {
      baseQuery['location.city'] = { $regex: location, $options: 'i' };
    }

    if (specialization) {
      baseQuery.specializations = specialization;
    }

    if (!providerType || providerType === 'Photographer') {
      providerQueries.push(
        Photographer.find(baseQuery).populate('user', 'name avatar')
      );
    }
    
    if (!providerType || providerType === 'Videographer') {
      providerQueries.push(
        Videographer.find(baseQuery).populate('user', 'name avatar')
      );
    }

    const providerResults = await Promise.all(providerQueries);
    const allProviders = providerResults.flat();

    // Calculate popularity score
    const popularProviders = allProviders.map(provider => {
      let popularityScore = 0;

      // Rating weight (40%)
      popularityScore += (provider.ratings.average / 5) * 0.4;

      // Review count weight (25%)
      const reviewScore = Math.min(provider.ratings.totalReviews / 50, 1);
      popularityScore += reviewScore * 0.25;

      // Profile views weight (20%)
      const viewScore = Math.min(provider.analytics.profileViews / 1000, 1);
      popularityScore += viewScore * 0.2;

      // Booking conversion weight (15%)
      const conversionRate = provider.analytics.bookingInquiries > 0 ?
        provider.analytics.bookingConversions / provider.analytics.bookingInquiries : 0;
      popularityScore += conversionRate * 0.15;

      return {
        ...provider.toObject(),
        popularityScore: Math.round(popularityScore * 100),
        providerType: provider.constructor.modelName
      };
    });

    return popularProviders
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);

  } catch (error) {
    console.error('Popular providers error:', error);
    throw new Error('Failed to get popular providers');
  }
};

export default {
  getPersonalizedRecommendations,
  getSimilarProviders,
  getTrendingProviders,
  getCollaborativeRecommendations,
  getPopularProviders
};
