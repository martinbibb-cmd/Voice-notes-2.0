// Transcript Analyzer
// Analyzes voice transcripts to detect discussed heating systems, issues, and requirements
// Powers context-aware FAB (Features, Advantages, Benefits) recommendations

export default class TranscriptAnalyzer {
  constructor() {
    // System type patterns
    this.systemPatterns = {
      combi: /combi\s*boiler|combination\s*boiler|combi|on[-\s]?demand|instant\s*hot\s*water/gi,
      system_unvented: /system\s*boiler|unvented\s*cylinder|sealed\s*cylinder|megaflo|pressurised\s*cylinder|mains\s*pressure\s*cylinder/gi,
      system_vented: /vented\s*cylinder|open\s*vented|gravity\s*fed|f&e\s*tank|feed\s*and\s*expansion|loft\s*tank/gi,
      regular: /regular\s*boiler|conventional\s*boiler|heat\s*only\s*boiler|traditional\s*system/gi,
      heat_pump: /heat\s*pump|air\s*source|ashp|ground\s*source|gshp/gi
    };

    // Issue patterns (problems that need solving)
    this.issuePatterns = {
      low_pressure: /low\s*pressure|poor\s*pressure|weak\s*shower|pressure\s*problem|slow\s*flow/gi,
      cold_radiators: /cold\s*radiator|radiator.*cold|not\s*heating|heating.*not\s*working|sludge|black\s*water/gi,
      simultaneous_demand: /two\s*showers|multiple\s*bathroom|shower.*same\s*time|kids.*bathroom|family.*morning/gi,
      noise: /noisy|banging|kettling|whistling|loud\s*boiler|rumbling/gi,
      inefficient: /high\s*bills?|expensive|inefficient|old\s*boiler|waste.*energy|cost.*fortune/gi,
      leaking: /leak|drip|water\s*damage|puddle/gi,
      no_hot_water: /no\s*hot\s*water|cold\s*water|waiting.*hot\s*water|takes\s*ages/gi,
      breakdown: /broken|not\s*working|fault|error|keeps\s*cutting\s*out|unreliable/gi,
      poor_flow: /poor\s*flow|trickle|weak\s*flow|slow\s*to\s*fill/gi,
      space_constraints: /no\s*space|tight\s*space|small.*cupboard|limited\s*space|compact/gi
    };

    // Solution/service patterns
    this.solutionPatterns = {
      powerflush: /powerflush|power\s*flush|system\s*flush|clean.*system|sludge.*removal|magnetic\s*filter/gi,
      new_system: /new\s*boiler|replace|replacement|upgrade|install/gi,
      repairs: /repair|fix|service|maintain/gi,
      controls: /smart\s*control|thermostat|nest|hive|tado|wifi\s*control|app\s*control/gi,
      radiator_work: /new\s*radiator|add.*radiator|move.*radiator|radiator\s*valve|trv/gi,
      insulation: /insulation|lagging|jacket|pipe.*insulation/gi
    };

    // Customer requirement patterns
    this.requirementPatterns = {
      future_proofing: /future.*proof|renewable|solar|eco.*friendly|green\s*energy|sustainable/gi,
      smart_features: /smart|app|wifi|control.*phone|remote\s*control/gi,
      reliability: /reliable|dependable|quality|last.*long|warranty/gi,
      efficiency: /efficient|save.*money|lower.*bill|eco|energy\s*saving/gi,
      performance: /powerful|good\s*pressure|hot\s*quickly|multiple.*tap|family\s*home/gi,
      simplicity: /simple|easy|straightforward|low\s*maintenance/gi,
      space_saving: /compact|small|space.*save|tidy/gi
    };
  }

  /**
   * Analyze transcript and return detected systems, issues, and requirements
   */
  analyze(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return this.getEmptyAnalysis();
    }

    const normalizedTranscript = transcript.toLowerCase();

    return {
      discussedSystems: this.detectDiscussedSystems(transcript),
      issues: this.detectIssues(transcript),
      solutions: this.detectSolutions(transcript),
      requirements: this.detectRequirements(transcript),
      keywords: this.extractKeywords(normalizedTranscript),
      sentiment: this.analyzeSentiment(normalizedTranscript)
    };
  }

  detectDiscussedSystems(transcript) {
    const discussed = {};

    for (const [systemType, pattern] of Object.entries(this.systemPatterns)) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        discussed[systemType] = {
          mentioned: true,
          count: matches.length,
          excerpts: this.extractExcerpts(transcript, pattern, 50)
        };
      }
    }

    return discussed;
  }

  detectIssues(transcript) {
    const issues = {};

    for (const [issueType, pattern] of Object.entries(this.issuePatterns)) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        issues[issueType] = {
          detected: true,
          count: matches.length,
          excerpts: this.extractExcerpts(transcript, pattern, 60),
          severity: this.estimateSeverity(issueType, matches.length)
        };
      }
    }

    return issues;
  }

  detectSolutions(transcript) {
    const solutions = {};

    for (const [solutionType, pattern] of Object.entries(this.solutionPatterns)) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        solutions[solutionType] = {
          mentioned: true,
          count: matches.length,
          excerpts: this.extractExcerpts(transcript, pattern, 60)
        };
      }
    }

    return solutions;
  }

  detectRequirements(transcript) {
    const requirements = {};

    for (const [reqType, pattern] of Object.entries(this.requirementPatterns)) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        requirements[reqType] = {
          mentioned: true,
          priority: this.estimatePriority(reqType, matches.length),
          excerpts: this.extractExcerpts(transcript, pattern, 50)
        };
      }
    }

    return requirements;
  }

  extractExcerpts(text, pattern, contextLength = 50) {
    const excerpts = [];
    const matches = [...text.matchAll(pattern)];

    for (const match of matches.slice(0, 3)) { // Limit to 3 excerpts
      const index = match.index;
      const start = Math.max(0, index - contextLength);
      const end = Math.min(text.length, index + match[0].length + contextLength);

      let excerpt = text.substring(start, end);
      if (start > 0) excerpt = '...' + excerpt;
      if (end < text.length) excerpt = excerpt + '...';

      excerpts.push(excerpt.trim());
    }

    return excerpts;
  }

  extractKeywords(transcript) {
    // Remove common words and extract significant terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'i', 'you', 'we', 'they', 'it'
    ]);

    const words = transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Count word frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));
  }

  analyzeSentiment(transcript) {
    const positiveWords = /good|great|excellent|happy|pleased|love|perfect|ideal|fantastic|wonderful/gi;
    const negativeWords = /bad|poor|terrible|awful|hate|problem|issue|broken|fault|worry|concern/gi;
    const urgentWords = /urgent|asap|soon|quickly|immediately|emergency/gi;

    const positive = (transcript.match(positiveWords) || []).length;
    const negative = (transcript.match(negativeWords) || []).length;
    const urgent = (transcript.match(urgentWords) || []).length;

    let overall = 'neutral';
    if (positive > negative + 2) overall = 'positive';
    else if (negative > positive + 2) overall = 'negative';

    return {
      overall,
      positive,
      negative,
      urgent,
      urgency: urgent > 0 ? 'high' : 'normal'
    };
  }

  estimateSeverity(issueType, count) {
    const criticalIssues = ['leaking', 'breakdown', 'no_hot_water'];
    const highIssues = ['cold_radiators', 'poor_flow', 'noise'];

    if (criticalIssues.includes(issueType)) return 'critical';
    if (highIssues.includes(issueType)) return 'high';
    if (count > 2) return 'medium-high';
    return 'medium';
  }

  estimatePriority(reqType, count) {
    if (count > 3) return 'high';
    if (count > 1) return 'medium';
    return 'low';
  }

  getEmptyAnalysis() {
    return {
      discussedSystems: {},
      issues: {},
      solutions: {},
      requirements: {},
      keywords: [],
      sentiment: {
        overall: 'neutral',
        positive: 0,
        negative: 0,
        urgent: 0,
        urgency: 'normal'
      }
    };
  }

  /**
   * Generate a summary of the analysis for display
   */
  generateSummary(analysis) {
    const { discussedSystems, issues, solutions, requirements, sentiment } = analysis;

    const summary = {
      systemsDiscussed: Object.keys(discussedSystems),
      topIssues: Object.entries(issues)
        .sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, 'medium-high': 2, medium: 1 };
          return severityOrder[b[1].severity] - severityOrder[a[1].severity];
        })
        .slice(0, 3)
        .map(([type, data]) => ({ type, ...data })),

      requestedSolutions: Object.keys(solutions),

      customerPriorities: Object.entries(requirements)
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b[1].priority] - priorityOrder[a[1].priority];
        })
        .slice(0, 3)
        .map(([type, data]) => ({ type, ...data })),

      sentiment: sentiment.overall,
      urgency: sentiment.urgency
    };

    return summary;
  }

  /**
   * Check if a specific system type was discussed
   */
  wasSystemDiscussed(analysis, systemType) {
    return analysis.discussedSystems.hasOwnProperty(systemType);
  }

  /**
   * Get relevance score for a system based on transcript
   */
  getSystemRelevance(analysis, systemType) {
    let score = 0;

    // Direct mention
    if (analysis.discussedSystems[systemType]) {
      score += 50;
      score += analysis.discussedSystems[systemType].count * 10;
    }

    // Matching issues
    const systemIssueMatch = {
      combi: ['space_constraints', 'no_hot_water'],
      system_unvented: ['low_pressure', 'simultaneous_demand', 'poor_flow'],
      system_vented: ['low_pressure'],
      regular: [],
      heat_pump: ['inefficient', 'future_proofing']
    };

    if (systemIssueMatch[systemType]) {
      systemIssueMatch[systemType].forEach(issue => {
        if (analysis.issues[issue]) {
          score += 15;
        }
      });
    }

    // Matching requirements
    const systemReqMatch = {
      combi: ['simplicity', 'space_saving'],
      system_unvented: ['performance', 'future_proofing'],
      system_vented: ['reliability'],
      heat_pump: ['efficiency', 'future_proofing']
    };

    if (systemReqMatch[systemType]) {
      systemReqMatch[systemType].forEach(req => {
        if (analysis.requirements[req]) {
          score += 10;
        }
      });
    }

    return score;
  }
}
