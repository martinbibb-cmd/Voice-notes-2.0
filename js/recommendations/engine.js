// Recommendations Engine
// Generates tailored heating system recommendations based on customer profile
// Based on System-recommendations logic

export default class RecommendationsEngine {
  constructor() {
    this.systemProfiles = this.loadSystemProfiles();
  }

  loadSystemProfiles() {
    return {
      combi_boiler: {
        title: 'Combi Boiler System',
        summary: 'Compact, on-demand hot water without a tank. Best for smaller properties with limited space.',
        efficiency: '83-86%',
        installCost: 'Low-Medium',
        space: 'Minimal - no tank needed',
        lifespan: '12-15 years',
        strengths: [
          'No hot water cylinder needed - saves space',
          'Hot water on demand - no waiting for tank to heat',
          'Lower installation costs',
          'Good for smaller homes (1-3 bedrooms, 1-2 bathrooms)',
          'Simple system - fewer components to maintain'
        ],
        limitations: [
          'Cannot supply multiple taps at full pressure simultaneously',
          'Flow rate depends on incoming mains pressure',
          'Water waste while waiting for hot water (especially in larger homes)',
          'Not suitable for homes with poor mains pressure',
          'Higher running costs for homes with high hot water demand'
        ],
        bestFor: 'Flats, apartments, and smaller homes (1-3 bed) with good mains pressure'
      },
      system_boiler_unvented: {
        title: 'System Boiler with Unvented Cylinder',
        summary: 'High-performance system with stored hot water at mains pressure. Excellent for larger homes.',
        efficiency: '88-91%',
        installCost: 'Medium-High',
        space: 'Needs cylinder cupboard',
        lifespan: '15-20 years',
        strengths: [
          'Excellent multi-outlet performance - can run multiple taps/showers',
          'Mains pressure hot water throughout',
          'More efficient than combi for high usage homes',
          'Compatible with solar thermal and heat pumps',
          'Future-proof for renewable integration',
          'Minimal wait time for hot water'
        ],
        limitations: [
          'Higher installation cost (cylinder + controls)',
          'Requires space for cylinder',
          'Needs good mains pressure (1.5+ bar)',
          'Annual G3 safety inspection required',
          'Cylinder can lose heat when not well insulated'
        ],
        bestFor: 'Modern 3-4+ bed homes with multiple bathrooms and good mains pressure'
      },
      system_boiler_vented: {
        title: 'System Boiler with Open Vented Cylinder',
        summary: 'Reliable stored hot water system. Works with any mains pressure.',
        efficiency: '87-90%',
        installCost: 'Medium',
        space: 'Needs cylinder + loft tanks',
        lifespan: '15-20 years',
        strengths: [
          'Works with any mains pressure - even very low',
          'Reliable hot water storage',
          'Simple system - less to go wrong',
          'Good for multiple outlets (though not mains pressure)',
          'Lower installation cost than unvented',
          'No annual G3 inspection needed'
        ],
        limitations: [
          'Lower water pressure than unvented',
          'Needs loft space for feed tanks',
          'More heat loss from venting',
          'Not suitable for flats/properties without loft',
          'Older technology - less future-proof'
        ],
        bestFor: 'Older properties, homes with poor mains pressure, or where loft tanks exist'
      },
      regular_boiler_vented: {
        title: 'Regular Boiler with Open Vented Cylinder',
        summary: 'Traditional heating system. Very reliable and proven technology.',
        efficiency: '86-89%',
        installCost: 'Low-Medium',
        space: 'Needs cylinder + loft tanks',
        lifespan: '15-25 years',
        strengths: [
          'Proven, reliable technology',
          'Works with any water pressure',
          'Like-for-like replacement if upgrading old system',
          'Lower installation cost for existing vented systems',
          'Very long lifespan',
          'Simple to repair and maintain'
        ],
        limitations: [
          'Lower water pressure',
          'Requires loft space',
          'More components than newer systems',
          'Not as efficient as modern sealed systems',
          'Heat loss from venting',
          'Older technology'
        ],
        bestFor: 'Replacing existing regular boiler systems, older properties'
      }
    };
  }

  generate(profile) {
    // profile: { customerName, propertyType, bedrooms, bathrooms, occupants, currentSystem }

    const recommendations = [];

    // Evaluate each system option
    for (const [key, system] of Object.entries(this.systemProfiles)) {
      const score = this.scoreSystem(key, profile);

      recommendations.push({
        ...system,
        score,
        rationale: this.generateRationale(key, profile)
      });
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Return top 3
    return recommendations.slice(0, 3);
  }

  scoreSystem(systemKey, profile) {
    let score = 0;

    const { propertyType, bedrooms, bathrooms, occupants, currentSystem } = profile;

    // Combi boiler scoring
    if (systemKey === 'combi_boiler') {
      if (bedrooms <= 3 && bathrooms <= 2 && occupants <= 3) {
        score += 8; // Great for small homes
      } else if (bedrooms >= 4 || bathrooms >= 3) {
        score -= 5; // Poor for larger homes
      }

      if (propertyType === 'flat') {
        score += 5; // Excellent for flats
      }

      if (currentSystem === 'combi') {
        score += 3; // Like-for-like replacement
      }
    }

    // System boiler with unvented cylinder
    if (systemKey === 'system_boiler_unvented') {
      if (bedrooms >= 3 && bathrooms >= 2) {
        score += 10; // Excellent for larger homes
      }

      if (occupants >= 4) {
        score += 5; // Great for high usage
      }

      if (propertyType === 'detached' || propertyType === 'semi') {
        score += 3; // Good for houses
      }

      if (propertyType === 'flat') {
        score -= 3; // More complex for flats
      }
    }

    // System boiler with vented cylinder
    if (systemKey === 'system_boiler_vented') {
      if (propertyType === 'flat') {
        score -= 10; // Not suitable for flats (no loft)
      }

      if (currentSystem === 'system' || currentSystem === 'regular') {
        score += 4; // Easier upgrade path
      }

      if (bedrooms >= 3) {
        score += 3;
      }
    }

    // Regular boiler with vented cylinder
    if (systemKey === 'regular_boiler_vented') {
      if (currentSystem === 'regular') {
        score += 8; // Like-for-like, simple replacement
      }

      if (propertyType === 'flat') {
        score -= 10; // Not suitable for flats
      }

      // Generally lower score as older technology
      score -= 2;
    }

    // General adjustments
    if (occupants >= 5) {
      // High usage homes need stored hot water
      if (systemKey.includes('vented') || systemKey.includes('unvented')) {
        score += 4;
      }
    }

    return Math.max(0, score); // Ensure non-negative
  }

  generateRationale(systemKey, profile) {
    const { customerName, propertyType, bedrooms, bathrooms, occupants } = profile;

    const rationales = {
      combi_boiler: `For a ${propertyType} with ${bedrooms} bedroom(s) and ${occupants} occupant(s), a combi boiler offers simplicity and space-saving benefits. It provides hot water on demand without the need for a cylinder, making it ideal for properties with limited space. However, with ${bathrooms} bathroom(s), you may occasionally experience reduced pressure if multiple taps are used simultaneously.`,

      system_boiler_unvented: `With ${bedrooms} bedroom(s), ${bathrooms} bathroom(s), and ${occupants} people living in the home, a system boiler with an unvented cylinder is the best choice for consistent hot water at high pressure throughout the property. This system can easily handle multiple showers and taps running at once, and it's future-proof for adding renewable technologies like solar panels or heat pumps. While it requires more space and has higher upfront costs, the superior performance and efficiency make it worthwhile for your household size.`,

      system_boiler_vented: `For your ${propertyType} with ${bedrooms} bedroom(s) and ${bathrooms} bathroom(s), a system boiler with a vented cylinder provides reliable hot water storage without requiring high mains pressure. This is particularly useful if your property has low or variable water pressure. The system is simpler than an unvented cylinder (no annual G3 inspection needed) and provides good performance for ${occupants} people. The main trade-off is lower water pressure compared to unvented systems and the need for loft space for feed tanks.`,

      regular_boiler_vented: `A regular boiler with vented cylinder is a tried-and-tested system that works well in traditional properties. For your ${bedrooms} bedroom ${propertyType}, this represents a straightforward replacement if you're upgrading from an existing regular boiler system. While not the most modern technology, it's reliable, long-lasting, and doesn't require high mains pressure. It's a cost-effective option for ${occupants} people, though you won't get the high water pressure of newer systems.`
    };

    return rationales[systemKey] || 'This system could work well for your property based on the information provided.';
  }

  // Generate product-specific recommendations
  generateProductRecommendations(systemKey, profile) {
    const products = {
      combi_boiler: [
        {
          name: 'Viessmann Vitodens 050-W',
          features: ['Compact design', 'Quiet operation', 'Built-in weather compensation'],
          benefits: ['Saves space', 'Won\'t disturb sleep', 'Automatically adjusts to weather'],
          whySpecific: 'Perfect size for your property and highly reliable'
        },
        {
          name: 'Worcester Bosch Greenstar 4000',
          features: ['UK\'s most popular boiler', '10-year warranty', 'A-rated efficiency'],
          benefits: ['Proven reliability', 'Long-term peace of mind', 'Lower running costs'],
          whySpecific: 'Industry-leading brand with excellent support network'
        }
      ],
      system_boiler_unvented: [
        {
          name: 'Viessmann Vitodens 200-W System Boiler',
          features: ['Weather compensation', 'Stainless steel heat exchanger', 'App control'],
          benefits: ['Optimizes efficiency automatically', 'Long lifespan', 'Control from anywhere'],
          whySpecific: 'Premium system perfect for your multi-bathroom home'
        },
        {
          name: 'Megaflo Eco Unvented Cylinder (210L)',
          features: ['Excellent insulation', 'Long warranty', 'High recovery rate'],
          benefits: ['Minimal heat loss', 'Reliable performance', 'Quick reheating'],
          whySpecific: 'Right size for your household of ${profile.occupants} people'
        }
      ]
    };

    return products[systemKey] || [];
  }
}
