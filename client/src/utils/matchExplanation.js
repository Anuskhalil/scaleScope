// 1. Add matching explanation utility: src/utils/matchExplanation.js
export function getMatchExplanation(userProfile, suggestedProfile, matchType) {
    const reasons = [];
    
    if (matchType === 'mentor') {
      const skillOverlap = userProfile.skills?.filter(s => 
        suggestedProfile.expertise_areas?.includes(s)
      ) || [];
      if (skillOverlap.length > 0) {
        reasons.push(`Shares expertise in ${skillOverlap.slice(0, 2).join(' & ')}`);
      }
      
      const interestOverlap = userProfile.interests?.filter(i => 
        suggestedProfile.interests?.includes(i)
      ) || [];
      if (interestOverlap.length > 0) {
        reasons.push(`Interested in ${interestOverlap[0]}`);
      }
      
      if (userProfile.location && suggestedProfile.profiles?.location === userProfile.location) {
        reasons.push('Located in your area');
      }
    }
    
    if (matchType === 'cofounder') {
      // Complementary skills logic
      const userSkills = new Set(userProfile.skills_with_levels?.map(s => s.skill) || []);
      const candidateSkills = new Set(suggestedProfile.skills_with_levels?.map(s => s.skill) || []);
      
      const complementary = [...candidateSkills].filter(s => !userSkills.has(s)).slice(0, 2);
      if (complementary.length > 0) {
        reasons.push(`Complements your skills with ${complementary.join(', ')}`);
      }
      
      if (userProfile.startup_idea_description && suggestedProfile.startup_idea_description) {
        reasons.push('Also building a startup');
      }
    }
    
    return reasons.length > 0 ? reasons : ['Profile alignment based on your activity'];
  }