export type WordSource =
  | { type: 'common'; count: number }
  | { type: 'tutorial'; beat: 1 | 2 | 3 }
  | { type: 'custom'; words: string[] };

// Top 200 common English words for typing practice
const COMMON_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'was', 'are', 'been', 'has', 'had', 'did', 'does', 'where', 'here',
  'still', 'should', 'while', 'world', 'life', 'last', 'long', 'great', 'little', 'own',
  'old', 'right', 'big', 'high', 'small', 'large', 'next', 'early', 'young', 'start',
  'feel', 'seem', 'help', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
  'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include',
  'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create',
  'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer',
  'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect',
  'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass',
  'sell', 'require', 'report', 'decide', 'pull', 'develop', 'thank', 'carry', 'break', 'receive',
];

// Tutorial text — placeholders for now, Russell will write final copy
const TUTORIAL_BEATS = {
  1: 'this is not just a typing test. every word you type plants a seed.',
  2: 'your choices shape what grows here. type to proceed. choose to evolve. the garden remembers what you tend.',
  3: 'you have typed enough to understand. the next choice determines your path. cosmetic changes how it looks. mechanical changes how it plays. data changes what it reveals. choose wisely. or choose freely. either way, the garden grows.',
};

export function generateWords(source: WordSource): string[] {
  switch (source.type) {
    case 'common': {
      const shuffled = [...COMMON_WORDS].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, source.count);
    }
    case 'tutorial': {
      return TUTORIAL_BEATS[source.beat].split(' ');
    }
    case 'custom': {
      return source.words;
    }
  }
}
