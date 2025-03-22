// Function to calculate remaining credits
function calculateRemainingCredits(studentProfile) {
    return studentProfile.totalCredits - studentProfile.usedCredits;
  }
  
  module.exports = {
    calculateRemainingCredits,
  };