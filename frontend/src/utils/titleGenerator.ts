/**
 * Title Generator
 * Generates meaningful titles for conversations using keyword extraction or random names
 */

// Stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
  'if', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with',
  'can', 'could', 'would', 'should', 'will', 'do', 'does', 'did',
  'have', 'has', 'had', 'what', 'when', 'where', 'why', 'how',
  'who', 'which', 'that', 'this', 'these', 'those', 'me', 'my',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'we', 'us',
  'their', 'them', 'i', 'am', 'was', 'were', 'been', 'being',
  'explain', 'help', 'please', 'thanks', 'thank', 'need', 'ask', 'get',
  'make', 'give', 'take', 'put', 'use', 'find', 'think', 'know',
  'about', 'just', 'also', 'other', 'same', 'such', 'no', 'not'
]);

// Technical patterns for bonus scoring
const IMPORTANT_PATTERNS = [
  /react/i, /python/i, /javascript/i, /typescript/i,
  /api/i, /database/i, /server/i, /code/i, /debug/i,
  /node/i, /sql/i, /html/i, /css/i, /java/i, /golang/i,
  /rust/i, /cpp/i, /csharp/i, /php/i, /ruby/i, /golang/i,
  /docker/i, /kubernetes/i, /aws/i, /azure/i, /gcp/i,
  /framework/i, /library/i, /function/i, /class/i, /method/i
];

// Adjectives for random names
const ADJECTIVES = [
  'Swift', 'Cosmic', 'Radiant', 'Zen', 'Vivid', 'Bright', 'Golden',
  'Serene', 'Daring', 'Clever', 'Noble', 'Wise', 'Keen', 'Bold',
  'Calm', 'Elegant', 'Fresh', 'Grand', 'Happy', 'Jolly', 'Kind',
  'Lively', 'Mighty', 'Neat', 'Peaceful'
];

// Nouns for random names
const NOUNS = [
  'Phoenix', 'Journey', 'Summit', 'Tiger', 'Eagle', 'Ocean',
  'Mountain', 'Forest', 'River', 'Sky', 'Storm', 'Light',
  'Dream', 'Star', 'Moon', 'Sun', 'Wind', 'Fire', 'Wave',
  'Cloud', 'Thunder', 'Bridge', 'Valley', 'Horizon'
];

/**
 * Extract keywords from text using intelligent scoring
 */
function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);

  // Score each word
  const scored = words
    .filter(word => !STOPWORDS.has(word))
    .map(word => {
      let score = 0;

      // Base score from length
      score += Math.min(word.length, 10);

      // Bonus for technical terms
      if (IMPORTANT_PATTERNS.some(pattern => pattern.test(word))) {
        score += 20;
      }

      return { word, score };
    });

  // Get top 3 keywords
  const topKeywords = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.word)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1));

  return topKeywords;
}

/**
 * Generate a random name from adjectives and nouns
 */
function generateRandomName(existingTitles: string[] = []): string {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const name = `${adj} ${noun}`;

    // Check for uniqueness
    if (!existingTitles.includes(name)) {
      return name;
    }

    retries++;
  }

  // Fallback with numbered suffix
  return `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]} ${Math.floor(Math.random() * 100)}`;
}

/**
 * Check if text is a greeting
 */
function isGreeting(text: string): boolean {
  const greetings = [
    'hi', 'hello', 'hey', 'greetings', 'welcome', 'good morning',
    'good afternoon', 'good evening', 'howdy', 'sup', 'yo'
  ];

  const normalized = text.toLowerCase().trim();
  return greetings.some(greeting => normalized.startsWith(greeting) && normalized.length < 50);
}

/**
 * Main title generation function
 */
export function generateTitle(
  firstUserMessage: string | undefined,
  existingTitles: string[] = []
): string {
  // Handle empty message
  if (!firstUserMessage || firstUserMessage.trim().length === 0) {
    return 'New Conversation';
  }

  const message = firstUserMessage.trim();

  // Check if message contains only special characters
  const alphanumericOnly = message.replace(/[^\w\s]/g, '').trim();
  if (!alphanumericOnly) {
    // Only special characters, treat like a greeting - generate random name
    return generateRandomName(existingTitles);
  }

  // Check if very short greeting
  if (message.length < 30 && isGreeting(message)) {
    return generateRandomName(existingTitles);
  }

  // Try to extract keywords
  const keywords = extractKeywords(message);

  if (keywords.length > 0) {
    // Limit to 3 words maximum
    const limitedKeywords = keywords.slice(0, 3);
    const title = limitedKeywords.join(' ');
    if (title.length <= 50) {
      return title;
    }
    // Trim if too long
    return keywords.slice(0, 2).join(' ');
  }

  // No keywords extracted
  // For very short messages, try using as-is
  if (message.length < 30 && message.length > 1) {
    const formatted = message.charAt(0).toUpperCase() + message.slice(1);
    return formatted.length > 50 ? formatted.substring(0, 50) : formatted;
  }

  // Fallback to random name if extraction failed
  return generateRandomName(existingTitles);
}

/**
 * Validate title format
 */
export function isValidTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  if (title.length > 50) return false;
  if (title.length < 1) return false;
  return true;
}

/**
 * Get all random names to check for duplicates
 */
export function getAllRandomNames(): string[] {
  const names: string[] = [];
  for (let i = 0; i < ADJECTIVES.length; i++) {
    for (let j = 0; j < NOUNS.length; j++) {
      names.push(`${ADJECTIVES[i]} ${NOUNS[j]}`);
    }
  }
  return names;
}

/**
 * Get unique title for conversation
 */
export function getUniqueTitle(
  firstUserMessage: string | undefined,
  existingTitles: string[] = []
): string {
  const title = generateTitle(firstUserMessage, existingTitles);

  // If title is already in use and not "New Conversation", try appending number
  if (existingTitles.includes(title) && title !== 'New Conversation') {
    for (let i = 1; i <= 100; i++) {
      const newTitle = `${title} ${i}`;
      if (!existingTitles.includes(newTitle)) {
        return newTitle;
      }
    }
  }

  return title;
}

export const WORDLISTS = {
  adjectives: ADJECTIVES,
  nouns: NOUNS,
  stopwords: Array.from(STOPWORDS)
};
