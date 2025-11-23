import { describe, it, expect } from 'vitest';
import {
  generateTitle,
  isValidTitle,
  getAllRandomNames,
  getUniqueTitle,
  WORDLISTS
} from '../utils/titleGenerator';

describe('titleGenerator', () => {
  describe('Keyword Extraction', () => {
    it('should extract keywords from React question', () => {
      const message = 'Can you help me debug my React component?';
      const title = generateTitle(message, []);
      expect(title).toMatch(/React|Debug|Component/i);
      expect(title.split(' ').length).toBeLessThanOrEqual(3);
    });

    it('should extract Python from script question', () => {
      const message = 'Write a Python script to analyze CSV files';
      const title = generateTitle(message, []);
      expect(title).toMatch(/Python|Script|CSV/i);
    });

    it('should extract quantum computing keywords', () => {
      const message = 'Explain quantum computing';
      const title = generateTitle(message, []);
      expect(title).toMatch(/Quantum|Computing/i);
    });

    it('should extract CSS keywords', () => {
      const message = 'How do I center a div in CSS?';
      const title = generateTitle(message, []);
      expect(title).toMatch(/Center|Div|CSS/i);
    });

    it('should prioritize technical terms', () => {
      const message = 'I am having trouble with JavaScript function scope';
      const title = generateTitle(message, []);
      expect(title).toMatch(/JavaScript|Function|Scope/i);
    });

    it('should extract from longer technical text', () => {
      const message = 'I need help debugging a Node.js API server that is returning 500 errors when processing database queries';
      const title = generateTitle(message, []);
      expect(title).toMatch(/Node|API|Database|Server|Error/i);
      expect(title.split(' ').length).toBeLessThanOrEqual(3);
    });
  });

  describe('Random Name Generation', () => {
    it('should generate random name for greeting "Hi there"', () => {
      const title = generateTitle('Hi there!', []);
      expect(title).not.toMatch(/^Hi/i);
      const allNames = getAllRandomNames();
      expect(allNames).toContain(title);
    });

    it('should generate random name for greeting "Hello"', () => {
      const title = generateTitle('Hello', []);
      expect(title).not.toBe('Hello');
      const allNames = getAllRandomNames();
      expect(allNames).toContain(title);
    });

    it('should generate random name for dots "..."', () => {
      const title = generateTitle('...', []);
      expect(title).not.toBe('...');
      const allNames = getAllRandomNames();
      expect(allNames).toContain(title);
    });

    it('should generate Adjective + Noun format', () => {
      const title = generateTitle('Hey', []);
      const parts = title.split(' ');
      expect(parts.length).toBe(2);
      expect(WORDLISTS.adjectives).toContain(parts[0]);
      expect(WORDLISTS.nouns).toContain(parts[1]);
    });

    it('should generate unique names for different calls', () => {
      const titles = new Set();
      for (let i = 0; i < 20; i++) {
        titles.add(generateTitle('hello', []));
      }
      expect(titles.size).toBeGreaterThan(1);
    });

    it('should avoid duplicates when provided existing titles', () => {
      const existing = ['Swift Phoenix', 'Cosmic Journey'];
      const title = generateTitle('Hi', existing);
      expect(existing).not.toContain(title);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      expect(generateTitle('', [])).toBe('New Conversation');
      expect(generateTitle(undefined, [])).toBe('New Conversation');
    });

    it('should handle very long message (100+ words)', () => {
      const longMessage = 'I am working on a complex project involving React Native for mobile development and I need help optimizing the performance of my application especially when dealing with large datasets and async operations in Redux. Can you provide some guidance on best practices?';
      const title = generateTitle(longMessage, []);
      expect(title.split(' ').length).toBeLessThanOrEqual(3);
      expect(title.length).toBeLessThanOrEqual(50);
    });

    it('should handle special characters gracefully', () => {
      const message = '!@#$%^&*()';
      const title = generateTitle(message, []);
      // Special characters should generate a random name
      const allNames = getAllRandomNames();
      expect(allNames).toContain(title);
    });

    it('should handle message with only whitespace', () => {
      expect(generateTitle('   \n\t  ', [])).toBe('New Conversation');
    });

    it('should handle message with URLs', () => {
      const message = 'Check this out https://example.com and help me understand the API';
      const title = generateTitle(message, []);
      expect(title).toBeTruthy();
      expect(title.length).toBeLessThanOrEqual(50);
    });

    it('should handle message with code snippets', () => {
      const message = 'Why does this code not work? const x = {a: 1}; console.log(x.b);';
      const title = generateTitle(message, []);
      expect(title).toBeTruthy();
      expect(title.length).toBeLessThanOrEqual(50);
    });

    it('should handle message with numbers', () => {
      const message = 'What is 2 + 2 and how do I calculate 50 * 3?';
      const title = generateTitle(message, []);
      expect(title).toBeTruthy();
    });

    it('should handle mixed case input', () => {
      const message = 'HELP ME WITH MY jAvAsScRiPt CODE please';
      const title = generateTitle(message, []);
      expect(title).toMatch(/JavaScript|Code|Help/i);
    });
  });

  describe('Title Validation', () => {
    it('should validate correct titles', () => {
      expect(isValidTitle('React Debug')).toBe(true);
      expect(isValidTitle('New Conversation')).toBe(true);
      expect(isValidTitle('A')).toBe(true);
    });

    it('should reject empty title', () => {
      expect(isValidTitle('')).toBe(false);
    });

    it('should reject very long titles', () => {
      const longTitle = 'A'.repeat(51);
      expect(isValidTitle(longTitle)).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidTitle(null as any)).toBe(false);
      expect(isValidTitle(undefined as any)).toBe(false);
    });

    it('should reject non-string', () => {
      expect(isValidTitle(123 as any)).toBe(false);
      expect(isValidTitle({} as any)).toBe(false);
    });
  });

  describe('Uniqueness', () => {
    it('should return unique title when duplicate exists', () => {
      const existing = ['Swift Phoenix', 'Cosmic Journey'];
      const title = getUniqueTitle('Hi', existing);
      expect(existing).not.toContain(title);
    });

    it('should not modify keyword titles when unique', () => {
      const title1 = getUniqueTitle('React debugging', ['Other Title']);
      const title2 = getUniqueTitle('React debugging', []);
      expect(title1).toBe(title2);
    });

    it('should handle multiple duplicate attempts', () => {
      const existing = ['Swift Phoenix'];
      for (let i = 0; i < 5; i++) {
        const title = getUniqueTitle('Hi', existing);
        expect(existing).not.toContain(title);
        existing.push(title);
      }
    });
  });

  describe('Quality Standards', () => {
    it('all generated titles should be 1-3 words', () => {
      const testMessages = [
        'Can you help me debug my React component?',
        'Write a Python script',
        'Hi',
        'Hello world',
        'Explain quantum computing concepts'
      ];

      testMessages.forEach(message => {
        const title = generateTitle(message, []);
        const wordCount = title.split(' ').filter(w => w.length > 0).length;
        expect(wordCount).toBeLessThanOrEqual(3);
        expect(wordCount).toBeGreaterThan(0);
      });
    });

    it('all generated titles should be <= 50 characters', () => {
      const testMessages = [
        'Can you help me debug my React component?',
        'Write a very long Python script to analyze CSV files and generate reports',
        'Explain quantum computing with great detail and many examples'
      ];

      testMessages.forEach(message => {
        const title = generateTitle(message, []);
        expect(title.length).toBeLessThanOrEqual(50);
      });
    });

    it('titles should be properly capitalized', () => {
      const testMessages = [
        'can you help me debug my react component?',
        'write a python script',
        'explain quantum computing'
      ];

      testMessages.forEach(message => {
        const title = generateTitle(message, []);
        // Each word should start with capital letter
        const words = title.split(' ');
        words.forEach(word => {
          if (word.length > 0) {
            expect(word[0]).toBe(word[0].toUpperCase());
          }
        });
      });
    });

    it('no duplicate titles in conversation list', () => {
      const titles = new Set();
      const existingTitles: string[] = [];

      for (let i = 0; i < 50; i++) {
        const title = generateTitle(`Hello ${i}`, existingTitles);
        expect(titles.has(title)).toBe(false);
        titles.add(title);
        existingTitles.push(title);
      }

      expect(titles.size).toBe(50);
    });

    it('random names should be memorable and distinct', () => {
      const allNames = getAllRandomNames();
      expect(allNames.length).toBe(25 * 24); // 25 adjectives × 24 nouns

      // Should not contain boring defaults
      allNames.forEach(name => {
        expect(name).not.toMatch(/^Conversation \d+$/);
        expect(name).not.toMatch(/^Chat \d+$/);
        expect(name).not.toMatch(/^Conv-[A-F0-9]+$/);
        expect(name).not.toMatch(/^\d{4}-\d{2}-\d{2}/); // No timestamps
      });
    });
  });

  describe('Performance', () => {
    it('should generate title instantly (< 50ms)', () => {
      const message = 'Can you help me debug my complex React component with hooks and context API?';

      const start = performance.now();
      generateTitle(message, []);
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('should handle rapid generation without lag', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        generateTitle(`Message ${i}`, []);
      }

      const end = performance.now();
      const avgTime = (end - start) / 100;

      expect(avgTime).toBeLessThan(5); // Average < 5ms per title
    });
  });

  describe('Real-world Examples', () => {
    const testCases = [
      {
        input: 'Can you help me debug my React component?',
        shouldMatch: /React|Debug|Component/i,
        description: 'React debugging question'
      },
      {
        input: 'Write a Python script to analyze CSV files',
        shouldMatch: /Python|CSV|Script/i,
        description: 'Python CSV analysis'
      },
      {
        input: 'Explain quantum computing',
        shouldMatch: /Quantum|Computing/i,
        description: 'Quantum computing explanation'
      },
      {
        input: 'How do I center a div in CSS?',
        shouldMatch: /Center|Div|CSS/i,
        description: 'CSS centering question'
      },
      {
        input: 'Hi there!',
        shouldNotBe: 'Hi there!',
        shouldBeRandomName: true,
        description: 'Casual greeting'
      },
      {
        input: 'Hello',
        shouldNotBe: 'Hello',
        shouldBeRandomName: true,
        description: 'Simple greeting'
      }
    ];

    testCases.forEach(testCase => {
      it(`should handle: ${testCase.description}`, () => {
        const title = generateTitle(testCase.input, []);

        if (testCase.shouldMatch) {
          expect(title).toMatch(testCase.shouldMatch);
        }

        if (testCase.shouldNotBe) {
          expect(title).not.toBe(testCase.shouldNotBe);
        }

        if (testCase.shouldBeRandomName) {
          const allNames = getAllRandomNames();
          expect(allNames).toContain(title);
        }

        expect(isValidTitle(title)).toBe(true);
      });
    });
  });
});
