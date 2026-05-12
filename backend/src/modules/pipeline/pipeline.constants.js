const DEFAULT_STAGES = [
  { name: "New", order: 1, probability: 5, isWon: false, isLost: false, isDefault: true },
  { name: "Contacted", order: 2, probability: 10, isWon: false, isLost: false, isDefault: false },
  { name: "Qualified", order: 3, probability: 25, isWon: false, isLost: false, isDefault: false },
  { name: "Proposal Sent", order: 4, probability: 40, isWon: false, isLost: false, isDefault: false },
  { name: "Negotiation", order: 5, probability: 60, isWon: false, isLost: false, isDefault: false },
  { name: "Won", order: 6, probability: 100, isWon: true, isLost: false, isDefault: false },
  { name: "Lost", order: 7, probability: 0, isWon: false, isLost: true, isDefault: false },
  { name: "Not Interested", order: 8, probability: 0, isWon: false, isLost: true, isDefault: false },
  { name: "Follow Up", order: 9, probability: 15, isWon: false, isLost: false, isDefault: false },
];

module.exports = { DEFAULT_STAGES };