// Enhanced Recommendations Engine
// Generates context-aware heating system recommendations with FAB (Features, Advantages, Benefits) analysis
// Based on System-recommendations logic + transcript context awareness

import TranscriptAnalyzer from './transcript-analyzer.js';

export default class RecommendationsEngine {
  constructor() {
    this.transcriptAnalyzer = new TranscriptAnalyzer();
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
        features: [
          'No hot water cylinder needed',
          'Hot water on demand',
          'Compact single unit',
          'Simple installation',
          'No loft tanks required'
        ],
        advantages: [
          'Saves valuable cupboard space',
          'Lower initial installation cost',
          'Suitable for good mains pressure',
          'Quick to heat water',
          'Fewer components to maintain'
        ],
        benefits: [
          'Never run out of hot water (unlimited supply from mains)',
          'Lower upfront investment',
          'Perfect for smaller homes and flats',
          'Easy to understand and operate',
          'Reduced maintenance costs'
        ],
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
        bestFor: 'Flats, apartments, and smaller homes (1-3 bed) with good mains pressure',
        solves: {
          space_constraints: 'Eliminates need for cylinder cupboard and loft tanks',
          simplicity: 'Single unit system, easy to understand',
          low_initial_cost: 'Most cost-effective system to install'
        }
      },

      system_boiler_unvented: {
        title: 'System Boiler with Unvented Cylinder',
        summary: 'High-performance system with stored hot water at mains pressure. Excellent for larger homes.',
        efficiency: '88-91%',
        installCost: 'Medium-High',
        space: 'Needs cylinder cupboard',
        lifespan: '15-20 years',
        features: [
          'Separate boiler and pressurised cylinder',
          'Mains pressure throughout',
          'Large hot water storage',
          'No loft tanks needed',
          'Compatible with renewables'
        ],
        advantages: [
          'Excellent multi-outlet performance',
          'Strong, consistent pressure',
          'More efficient for high usage',
          'Future-proof technology',
          'Quick recovery time'
        ],
        benefits: [
          'Run multiple showers simultaneously without pressure drop',
          'Power showers without pump needed',
          'Lower energy bills for families',
          'Ready for solar thermal or heat pump integration',
          'Minimal wait time for hot water'
        ],
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
        bestFor: 'Modern 3-4+ bed homes with multiple bathrooms and good mains pressure',
        solves: {
          simultaneous_demand: 'Stored hot water serves multiple outlets at once',
          low_pressure: 'Mains pressure delivery throughout property',
          poor_flow: 'High flow rates even with multiple taps running',
          future_proofing: 'Ready for solar panels and heat pumps'
        }
      },

      system_boiler_vented: {
        title: 'System Boiler with Open Vented Cylinder',
        summary: 'Reliable stored hot water system. Works with any mains pressure.',
        efficiency: '87-90%',
        installCost: 'Medium',
        space: 'Needs cylinder + loft tanks',
        lifespan: '15-20 years',
        features: [
          'Separate boiler and vented cylinder',
          'Feed & expansion tank in loft',
          'Large hot water storage',
          'Gravity-fed system',
          'Proven technology'
        ],
        advantages: [
          'Works with poor mains pressure',
          'Reliable and simple',
          'Good for multiple outlets',
          'Lower cost than unvented',
          'No annual inspection needed'
        ],
        benefits: [
          'Suitable for areas with low water pressure',
          'Long service life with minimal faults',
          'Can supply several taps at once',
          'Cheaper to install than unvented',
          'No regulatory inspection costs'
        ],
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
        bestFor: 'Older properties, homes with poor mains pressure, or where loft tanks exist',
        solves: {
          low_pressure: 'Does not rely on mains pressure',
          reliability: 'Simple, proven technology',
          simultaneous_demand: 'Stored hot water for multiple users'
        }
      },

      regular_boiler_vented: {
        title: 'Regular Boiler with Open Vented Cylinder',
        summary: 'Traditional heating system. Very reliable and proven technology.',
        efficiency: '86-89%',
        installCost: 'Low-Medium',
        space: 'Needs cylinder + loft tanks',
        lifespan: '15-25 years',
        features: [
          'Traditional heat-only boiler',
          'Separate hot water cylinder',
          'Feed & expansion tanks',
          'Cold water tank',
          'Proven reliability'
        ],
        advantages: [
          'Works with any pressure',
          'Like-for-like replacement',
          'Lower installation cost',
          'Very long lifespan',
          'Simple to repair'
        ],
        benefits: [
          'No dependency on mains pressure',
          'Easy upgrade from existing regular boiler',
          'Cost-effective installation',
          'Can last 20+ years with maintenance',
          'Easy to find parts and engineers'
        ],
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
        bestFor: 'Replacing existing regular boiler systems, older properties',
        solves: {
          reliability: 'Time-tested technology with proven track record',
          low_initial_cost: 'Affordable like-for-like replacement'
        }
      },

      powerflush: {
        title: 'Powerflush System Cleaning',
        summary: 'Deep cleaning service to remove sludge and restore heating efficiency.',
        isService: true,
        features: [
          'High-velocity water circulation',
          'Chemical cleaning agents',
          'Magnetic filter installation',
          'Individual radiator flushing',
          'System protection treatment'
        ],
        advantages: [
          'Removes years of accumulated sludge',
          'Improves heat distribution',
          'Extends system lifespan',
          'Reduces energy consumption',
          'Prevents future corrosion'
        ],
        benefits: [
          'All radiators heat up fully and evenly',
          'Lower energy bills from improved efficiency',
          'Boiler lasts longer with clean water',
          'Quieter operation without kettling',
          'Protects your investment in new boiler'
        ],
        solves: {
          cold_radiators: 'Removes sludge blocking water flow',
          noise: 'Eliminates debris causing kettling',
          inefficient: 'Restores system to optimal efficiency'
        },
        recommendWhen: ['cold_radiators', 'noise', 'inefficient', 'black_water'],
        duration: '4-6 hours',
        cost: '£400-£600'
      }
    };
  }

  /**
   * Generate recommendations based on profile and optional transcript
   */
  generate(profile, transcript = '') {
    // Analyze transcript if provided
    const transcriptAnalysis = transcript
      ? this.transcriptAnalyzer.analyze(transcript)
      : this.transcriptAnalyzer.getEmptyAnalysis();

    const recommendations = [];

    // Check if powerflush was discussed or needed
    if (this.shouldRecommendPowerflush(transcriptAnalysis)) {
      const powerflush = {
        ...this.systemProfiles.powerflush,
        score: 100,
        rationale: this.generatePowerflushRationale(transcriptAnalysis, profile),
        discussionContext: this.getDiscussionContext(transcriptAnalysis, 'powerflush')
      };
      recommendations.push(powerflush);
    }

    // Evaluate each heating system
    for (const [key, system] of Object.entries(this.systemProfiles)) {
      if (system.isService) continue; // Skip service items

      // Skip systems not discussed (unless no systems were discussed)
      const systemsDiscussed = Object.keys(transcriptAnalysis.discussedSystems);
      if (systemsDiscussed.length > 0 && !this.isRelevantToDiscussion(key, transcriptAnalysis)) {
        continue;
      }

      const score = this.scoreSystem(key, profile, transcriptAnalysis);
      const relevance = this.transcriptAnalyzer.getSystemRelevance(transcriptAnalysis, key);

      recommendations.push({
        ...system,
        systemKey: key,
        score: score + relevance,
        rationale: this.generateRationale(key, profile, transcriptAnalysis),
        fab: this.generateFAB(key, transcriptAnalysis, profile),
        discussionContext: this.getDiscussionContext(transcriptAnalysis, key)
      });
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Return top recommendations (3 systems + powerflush if recommended)
    return recommendations.slice(0, 4);
  }

  isRelevantToDiscussion(systemKey, analysis) {
    // Always show if directly mentioned
    if (this.transcriptAnalyzer.wasSystemDiscussed(analysis, systemKey)) {
      return true;
    }

    // Show if high relevance score
    const relevance = this.transcriptAnalyzer.getSystemRelevance(analysis, systemKey);
    return relevance >= 25;
  }

  shouldRecommendPowerflush(analysis) {
    const powerflushTriggers = ['cold_radiators', 'noise', 'inefficient'];
    const solutionMentioned = analysis.solutions.powerflush;

    const issuesPresent = powerflushTriggers.some(issue =>
      analysis.issues.hasOwnProperty(issue)
    );

    return solutionMentioned || issuesPresent;
  }

  generatePowerflushRationale(analysis, profile) {
    const issues = [];

    if (analysis.issues.cold_radiators) {
      issues.push('cold radiators indicating sludge buildup');
    }
    if (analysis.issues.noise) {
      issues.push('system noise from debris in pipes');
    }
    if (analysis.issues.inefficient) {
      issues.push('reduced efficiency from contaminated water');
    }

    if (issues.length === 0) {
      return `Based on the discussion, a powerflush would benefit your system by removing accumulated sludge and restoring optimal efficiency.`;
    }

    return `Based on the ${issues.join(', ')} you mentioned, a powerflush is strongly recommended. This will remove years of sludge buildup, restore full heating performance, and protect any new boiler installation. The issues you're experiencing are classic signs that your system needs deep cleaning.`;
  }

  scoreSystem(systemKey, profile, analysis) {
    let score = 0;

    const { propertyType, bedrooms, bathrooms, occupants, currentSystem } = profile;

    // Base scoring from System-recommendations logic
    if (systemKey === 'combi_boiler') {
      if (bedrooms <= 3 && bathrooms <= 2 && occupants <= 3) {
        score += 8;
      } else if (bedrooms >= 4 || bathrooms >= 3) {
        score -= 5;
      }

      if (propertyType === 'flat') {
        score += 5;
      }

      if (currentSystem === 'combi') {
        score += 3;
      }

      // Boost if space constraints mentioned
      if (analysis.issues.space_constraints) {
        score += 10;
      }
    }

    if (systemKey === 'system_boiler_unvented') {
      if (bedrooms >= 3 && bathrooms >= 2) {
        score += 10;
      }

      if (occupants >= 4) {
        score += 5;
      }

      if (propertyType === 'detached' || propertyType === 'semi') {
        score += 3;
      }

      if (propertyType === 'flat') {
        score -= 3;
      }

      // Boost for simultaneous demand
      if (analysis.issues.simultaneous_demand) {
        score += 15;
      }

      // Boost for performance requirements
      if (analysis.requirements.performance) {
        score += 10;
      }

      // Boost for future-proofing mentions
      if (analysis.requirements.future_proofing) {
        score += 8;
      }
    }

    if (systemKey === 'system_boiler_vented') {
      if (propertyType === 'flat') {
        score -= 10;
      }

      if (currentSystem === 'system' || currentSystem === 'regular') {
        score += 4;
      }

      if (bedrooms >= 3) {
        score += 3;
      }

      // Boost if low pressure mentioned
      if (analysis.issues.low_pressure) {
        score += 12;
      }
    }

    if (systemKey === 'regular_boiler_vented') {
      if (currentSystem === 'regular') {
        score += 8;
      }

      if (propertyType === 'flat') {
        score -= 10;
      }

      score -= 2; // Generally lower score as older technology

      // Boost for reliability requirements
      if (analysis.requirements.reliability) {
        score += 6;
      }
    }

    // General adjustments
    if (occupants >= 5) {
      if (systemKey.includes('vented') || systemKey.includes('unvented')) {
        score += 4;
      }
    }

    return Math.max(0, score);
  }

  generateRationale(systemKey, profile, analysis) {
    const { customerName, propertyType, bedrooms, bathrooms, occupants } = profile;

    let baseRationale = '';

    switch (systemKey) {
      case 'combi_boiler':
        baseRationale = `For a ${propertyType} with ${bedrooms} bedroom(s) and ${occupants} occupant(s), a combi boiler offers simplicity and space-saving benefits. It provides hot water on demand without the need for a cylinder.`;
        break;

      case 'system_boiler_unvented':
        baseRationale = `With ${bedrooms} bedroom(s), ${bathrooms} bathroom(s), and ${occupants} people, a system boiler with unvented cylinder provides consistent hot water at high pressure throughout. This system handles multiple showers simultaneously and is future-proof for renewables.`;
        break;

      case 'system_boiler_vented':
        baseRationale = `For your ${propertyType} with ${bedrooms} bedroom(s), a system boiler with vented cylinder provides reliable hot water storage without requiring high mains pressure. Ideal if you have variable water pressure.`;
        break;

      case 'regular_boiler_vented':
        baseRationale = `A regular boiler with vented cylinder is proven technology for your ${bedrooms} bedroom ${propertyType}. Works well regardless of mains pressure and represents a straightforward replacement for existing systems.`;
        break;
    }

    // Add transcript-specific context
    const contextAdditions = [];

    // Address specific issues mentioned
    const system = this.systemProfiles[systemKey];
    if (system.solves) {
      Object.entries(system.solves).forEach(([issue, solution]) => {
        if (analysis.issues[issue]) {
          contextAdditions.push(`Addresses your ${issue.replace(/_/g, ' ')}: ${solution}`);
        }
      });
    }

    if (contextAdditions.length > 0) {
      baseRationale += ' **Specifically discussed:** ' + contextAdditions.join('. ');
    }

    return baseRationale;
  }

  generateFAB(systemKey, analysis, profile) {
    const system = this.systemProfiles[systemKey];

    if (!system.features || !system.advantages || !system.benefits) {
      return null;
    }

    // Highlight FAB elements that relate to discussed issues
    const highlightedFeatures = this.highlightRelevant(
      system.features,
      analysis,
      systemKey
    );

    const highlightedAdvantages = this.highlightRelevant(
      system.advantages,
      analysis,
      systemKey
    );

    const highlightedBenefits = this.highlightRelevant(
      system.benefits,
      analysis,
      systemKey
    );

    return {
      features: highlightedFeatures,
      advantages: highlightedAdvantages,
      benefits: highlightedBenefits
    };
  }

  highlightRelevant(items, analysis, systemKey) {
    return items.map(item => {
      const highlighted = this.shouldHighlight(item, analysis, systemKey);
      return {
        text: item,
        highlighted,
        reason: highlighted ? this.getHighlightReason(item, analysis) : null
      };
    });
  }

  shouldHighlight(item, analysis) {
    const itemLower = item.toLowerCase();

    // Check if relates to discussed issues
    for (const [issueType, issueData] of Object.entries(analysis.issues)) {
      const issueTerms = issueType.replace(/_/g, ' ').split(' ');
      if (issueTerms.some(term => itemLower.includes(term))) {
        return true;
      }
    }

    // Check if relates to requirements
    for (const reqType of Object.keys(analysis.requirements)) {
      const reqTerms = reqType.replace(/_/g, ' ').split(' ');
      if (reqTerms.some(term => itemLower.includes(term))) {
        return true;
      }
    }

    return false;
  }

  getHighlightReason(item, analysis) {
    const itemLower = item.toLowerCase();

    for (const [issueType, issueData] of Object.entries(analysis.issues)) {
      const issueTerms = issueType.replace(/_/g, ' ');
      if (itemLower.includes(issueTerms) || issueTerms.split(' ').some(t => itemLower.includes(t))) {
        return `Addresses ${issueTerms} you mentioned`;
      }
    }

    for (const [reqType, reqData] of Object.entries(analysis.requirements)) {
      const reqTerms = reqType.replace(/_/g, ' ');
      if (itemLower.includes(reqTerms) || reqTerms.split(' ').some(t => itemLower.includes(t))) {
        return `Matches your ${reqTerms} requirement`;
      }
    }

    return null;
  }

  getDiscussionContext(analysis, systemKey) {
    const context = {
      mentioned: false,
      relatedIssues: [],
      relatedRequirements: [],
      excerpts: []
    };

    // Check if system was directly mentioned
    if (systemKey === 'powerflush' && analysis.solutions.powerflush) {
      context.mentioned = true;
      context.excerpts = analysis.solutions.powerflush.excerpts;
    } else if (analysis.discussedSystems[systemKey]) {
      context.mentioned = true;
      context.excerpts = analysis.discussedSystems[systemKey].excerpts;
    }

    // Find related issues
    const system = this.systemProfiles[systemKey];
    if (system && system.solves) {
      Object.keys(system.solves).forEach(issueType => {
        if (analysis.issues[issueType]) {
          context.relatedIssues.push({
            type: issueType,
            severity: analysis.issues[issueType].severity,
            excerpts: analysis.issues[issueType].excerpts
          });
        }
      });
    }

    return context;
  }
}
