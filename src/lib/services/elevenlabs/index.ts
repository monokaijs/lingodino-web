import 'server-only';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import {
  ElevenLabsVoice,
  DialogueSentence,
  ConversationParticipant,
  DialogueAlignment,
  DialogueSegment,
  WordTiming,
  SentenceSegment,
} from '@/lib/types/models/conversation';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.warn('ELEVENLABS_API_KEY is not set. ElevenLabs features will not work.');
}

// Initialize ElevenLabs client
function getClient(): ElevenLabsClient {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key is not configured');
  }
  return new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
}

export interface GenerateDialogueResult {
  audioBuffer: ArrayBuffer;
  alignment: DialogueAlignment;
}

/**
 * Fetch available voices from ElevenLabs
 */
export async function getVoices(): Promise<ElevenLabsVoice[]> {
  const client = getClient();
  const response = await client.voices.getAll();

  return response.voices.map(voice => ({
    voice_id: voice.voiceId,
    name: voice.name || 'Unknown',
    category: voice.category,
    labels: voice.labels as Record<string, string> | undefined,
    preview_url: voice.previewUrl,
  }));
}

/**
 * Format sentence text with tone/emotion markers for ElevenLabs
 * ElevenLabs v3 supports emotional context through descriptive text
 */
function formatSentenceWithEmotion(sentence: DialogueSentence): string {
  let text = sentence.text;

  // Add tone/emotion markers if specified
  // ElevenLabs v3 interprets markers like [cheerfully], [sadly], etc.
  const markers: string[] = [];

  if (sentence.tone) {
    markers.push(sentence.tone);
  }

  if (sentence.emotion) {
    markers.push(sentence.emotion);
  }

  if (markers.length > 0) {
    // Prepend emotion markers in brackets
    text = `[${markers.join(', ')}] ${text}`;
  }

  return text;
}

/**
 * Check if a character is a CJK (Chinese, Japanese, Korean) character
 * These languages generally don't use spaces between words, so we treat each character as a word
 */
function isCJK(char: string): boolean {
  // Common CJK ranges:
  // \u4E00-\u9FFF: CJK Unified Ideographs (Common Chinese)
  // \u3000-\u303F: CJK Symbols and Punctuation
  // \u3040-\u309F: Hiragana (Japanese)
  // \u30A0-\u30FF: Katakana (Japanese)
  // \uFF00-\uFFEF: Halfwidth and Fullwidth Forms
  // \uAC00-\uD7AF: Hangul Syllables (Korean)
  return /[\u4E00-\u9FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\uAC00-\uD7AF]/.test(char);
}

/**
 * Check if a word is an emotion/tone marker (e.g., "[cheerfully,", "happy]", "[excited]")
 */
function isEmotionMarker(word: string): boolean {
  // Skip words that are part of emotion markers in brackets
  // These look like: [cheerfully, happy] or [excited]
  return word.includes('[') || word.includes(']');
}

/**
 * Convert character-level alignment to word-level timing
 * - Filters out emotion markers
 * - Handles CJK characters as individual words
 * - Handles space-separated languages (English, etc.) by grouping characters
 */
function extractWordTimings(characters: string[], startTimes: number[], endTimes: number[]): WordTiming[] {
  const words: WordTiming[] = [];

  let currentWord = '';
  let wordStartIndex = -1;
  let insideBracket = false;

  const flushWord = (endIndex: number) => {
    if (currentWord.trim() && !isEmotionMarker(currentWord)) {
      // Find valid start/end times
      // We tracked wordStartIndex for the first char
      // endIndex is the index of the *last* char in this word
      const startTime = startTimes[wordStartIndex];
      const endTime = endTimes[endIndex];

      words.push({
        word: currentWord.trim(),
        start: startTime,
        end: endTime,
      });
    }
    currentWord = '';
    wordStartIndex = -1;
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    // 1. Handle Emotion markers [...]
    if (char === '[') {
      // If we had a word building up, flush it
      if (currentWord) flushWord(i - 1);
      insideBracket = true;
      currentWord = ''; // Reset
      continue;
    }
    if (char === ']') {
      insideBracket = false;
      continue;
    }
    if (insideBracket) continue;

    // 2. Handle CJK Characters
    // If we encounter a CJK char, it's a word by itself.
    // Also, if we were building an English word, it ends here.
    if (isCJK(char)) {
      // Flush previous word if exists (e.g. "Hello" in "Hello你好")
      if (currentWord) flushWord(i - 1);

      // Add the CJK char as its own word immediately (unless empty/whitespace)
      if (char.trim()) {
        words.push({
          word: char,
          start: startTimes[i],
          end: endTimes[i],
        });
      }
      continue;
    }

    // 3. Handle Spaces/Delimiters for non-CJK
    if (char === ' ' || char === '\n' || char === '\t') {
      if (currentWord) flushWord(i - 1);
      continue;
    }

    // 4. Regular characters (English/Latin/etc)
    if (currentWord === '') {
      wordStartIndex = i;
    }
    currentWord += char;
  }

  // Flush remaining
  if (currentWord) {
    flushWord(characters.length - 1);
  }

  return words;
}

/**
 * Map defined segments to character timings
 * ENSURES strict 1:1 mapping: one WordTiming for each segment.
 */
function mapSegmentsToTimings(
  segments: SentenceSegment[],
  alignmentChars: string[],
  startTimes: number[],
  endTimes: number[]
): WordTiming[] {
  const result: WordTiming[] = [];
  let alignIdx = 0;

  // Keep track of time to fill gaps
  let lastEndTime = startTimes.length > 0 ? startTimes[0] : 0;

  // Helper to check if char is punctuation/symbol
  const isPunctuation = (char: string) => /[.,;?!，。；？！"'：\[\]]/.test(char);

  for (const seg of segments) {
    const segText = seg.text;

    // If empty text, push placeholder
    if (!segText) {
      result.push({ word: '', start: lastEndTime, end: lastEndTime });
      continue;
    }

    let segMinStart = Infinity;
    let segMaxEnd = -1;
    let matchCount = 0;

    // We try to match as many characters of segText as possible against alignment
    // We allow skipping segment chars if they are punctuation and don't match alignment
    // We allow skipping alignment chars if they are whitespace/[emotion]

    let tempAlignIdx = alignIdx;
    let segCharIdx = 0;

    while (segCharIdx < segText.length && tempAlignIdx < alignmentChars.length) {
      const segChar = segText[segCharIdx];
      const alignChar = alignmentChars[tempAlignIdx];

      // 1. Skip Emotion Markers in Alignment [xxx]
      if (alignChar === '[') {
        while (tempAlignIdx < alignmentChars.length && alignmentChars[tempAlignIdx] !== ']') {
          tempAlignIdx++;
        }
        if (tempAlignIdx < alignmentChars.length) tempAlignIdx++; // consume ']'
        continue;
      }

      // 2. Skip Whitespace in Alignment (not in Segment)
      if (alignChar.trim() === '') {
        tempAlignIdx++;
        continue;
      }

      // 3. Match?
      if (alignChar.toLowerCase() === segChar.toLowerCase()) {
        if (startTimes[tempAlignIdx] < segMinStart) segMinStart = startTimes[tempAlignIdx];
        if (endTimes[tempAlignIdx] > segMaxEnd) segMaxEnd = endTimes[tempAlignIdx];

        matchCount++;
        tempAlignIdx++;
        segCharIdx++;
      } else {
        // Mismatch
        // If segChar is punctuation, maybe alignment doesn't have it? Skip segChar.
        if (isPunctuation(segChar)) {
          segCharIdx++;
          continue;
        }

        // If segChar is NOT punctuation, maybe alignment has extra char (noise)?
        // Or maybe we completely desynced. 
        // Let's try skipping alignment char.
        tempAlignIdx++;
      }
    }

    // If we matched at least one character, success
    if (matchCount > 0) {
      result.push({
        word: segText,
        start: segMinStart,
        end: segMaxEnd
      });
      lastEndTime = segMaxEnd;
      alignIdx = tempAlignIdx; // Commit alignment index
    } else {
      // Failed to match any meaningful characters.
      // This commonly happens if the segment is JUST punctuation (though we try to merge those now)
      // or if alignment is totally missing this part.

      // Force a 0-duration timing at lastEndTime
      result.push({
        word: segText,
        start: lastEndTime,
        end: lastEndTime
      });
    }
  }

  return result;
}

/**
 * Fallback: Distribute time evenly across segments based on text length
 */
function distributeTimings(
  segments: SentenceSegment[],
  startTime: number,
  endTime: number
): WordTiming[] {
  const result: WordTiming[] = [];
  const duration = endTime - startTime;

  // Calculate total length
  const totalLength = segments.reduce((sum, seg) => sum + (seg.text || '').length, 0);

  if (totalLength === 0) return [];

  let currentTime = startTime;
  const timePerChar = duration / totalLength;

  for (const seg of segments) {
    const text = seg.text || '';
    if (!text) continue;

    const segDuration = text.length * timePerChar;

    result.push({
      word: text,
      start: currentTime,
      end: currentTime + segDuration
    });

    currentTime += segDuration;
  }

  return result;
}

/**
 * Helper to collect stream chunks into a buffer
 */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  // Calculate total length
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

  // Combine chunks
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined.buffer;
}

/**
 * Generate dialogue audio from conversation sentences with word timings
 */
export async function generateDialogue(
  sentences: DialogueSentence[],
  participants: ConversationParticipant[]
): Promise<GenerateDialogueResult> {
  const client = getClient();

  // Sort sentences by order
  const sortedSentences = [...sentences].sort((a, b) => a.order - b.order);

  // Create voice ID lookup map
  const voiceMap = new Map<string, string>();
  for (const participant of participants) {
    voiceMap.set(participant.role, participant.voiceId);
  }

  // Build dialogue inputs
  const inputs = sortedSentences.map(sentence => ({
    text: formatSentenceWithEmotion(sentence),
    voiceId: voiceMap.get(sentence.participantRole) || '',
  }));

  // Validate all inputs have voice IDs
  for (const input of inputs) {
    if (!input.voiceId) {
      throw new Error('All participants must have a voice assigned');
    }
  }

  try {
    // Try convertWithTimestamps first for word timing data
    const response = await client.textToDialogue.convertWithTimestamps({
      inputs,
      modelId: 'eleven_v3',
    });

    // Response structure from ElevenLabs:
    // - audioBase64: the audio data
    // - voiceSegments: array of VoiceSegment with startTimeSeconds, endTimeSeconds, characterStartIndex, characterEndIndex
    // - alignment: GLOBAL character timing for all text combined
    // - normalizedAlignment: GLOBAL normalized character timing
    const audioBase64 = response.audioBase64;
    const voiceSegments = response.voiceSegments || [];
    // Use normalized alignment if available (handles text normalization), otherwise use regular alignment
    const globalAlignment = response.normalizedAlignment || response.alignment;

    // Decode base64 audio
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBuffer = bytes.buffer;
    // Build alignment from voice segments
    const segments: DialogueSegment[] = [];
    let totalDuration = 0;

    let globalCharIndex = 0; // Track position in global alignment
    for (let i = 0; i < voiceSegments.length; i++) {
      const voiceSegment = voiceSegments[i];
      const sentence = sortedSentences[i];

      if (!sentence || !voiceSegment) continue;

      // Get segment timing directly from voiceSegment
      const startTime = voiceSegment.startTimeSeconds;
      const endTime = voiceSegment.endTimeSeconds;

      // Extract word timings
      let words: WordTiming[] = [];
      if (
        globalAlignment?.characters &&
        globalAlignment?.characterStartTimesSeconds &&
        globalAlignment?.characterEndTimesSeconds
      ) {
        // Find where this sentence starts in the global alignment
        // We look for the sequence of characters that roughly matches sentence.text
        // starting from globalCharIndex.

        const sentenceTextRaw = sentence.text; // "你好，你叫什么名字？"

        // We need to advance globalCharIndex until we match the start of this sentence.
        // But ElevenLabs alignment characters might be slightly different (e.g. simplified, no punct).
        // We'll trust that the sequence follows.

        // Heuristic:
        // Match the non-punctuation characters of sentence against globalAlignment.characters
        // to find the range [start, end).

        let matchStartIndex = globalCharIndex;
        let matchEndIndex = globalCharIndex;

        let sentenceCharIdx = 0;
        let alignIdx = globalCharIndex;

        // Scan forward to map sentence chars to alignment chars
        while (
          sentenceCharIdx < sentenceTextRaw.length &&
          alignIdx < globalAlignment.characters.length
        ) {
          const sChar = sentenceTextRaw[sentenceCharIdx];
          const aChar = globalAlignment.characters[alignIdx];

          // Skip whitespace/punct in sentence that might not be in alignment
          if (/[.,;?!，。；？！"'：\[\]\s]/.test(sChar)) {
            sentenceCharIdx++;
            continue;
          }

          // Skip whitespace/brackets in alignment
          if (aChar === '[') {
            while (alignIdx < globalAlignment.characters.length && globalAlignment.characters[alignIdx] !== ']') {
              alignIdx++;
            }
            if (alignIdx < globalAlignment.characters.length) alignIdx++;
            continue;
          }
          if (/\s/.test(aChar)) {
            alignIdx++;
            continue;
          }

          // Compare
          if (sChar.toLowerCase() === aChar.toLowerCase()) {
            matchEndIndex = alignIdx + 1; // End is exclusive
            sentenceCharIdx++;
            alignIdx++;
          } else {
            // Mismatch?
            // E.g. ElevenLabs normalized text differently?
            // Assume Alignment skips this char? Or Sentence has extra?
            // Let's assume Sentence has extra char and skip it
            sentenceCharIdx++;
            // If we skip too many without match, we might have lost track, but let's hope sequential works.
          }
        }

        // Update globalCharIndex for next sentence to start AFTER this one
        globalCharIndex = alignIdx;

        // Slice the global arrays using the discovered indices
        const segmentChars = globalAlignment.characters.slice(matchStartIndex, matchEndIndex);
        const segmentStartTimes = globalAlignment.characterStartTimesSeconds.slice(matchStartIndex, matchEndIndex);
        const segmentEndTimes = globalAlignment.characterEndTimesSeconds.slice(matchStartIndex, matchEndIndex);

        if (sentence.segments && sentence.segments.length > 0) {
          words = mapSegmentsToTimings(sentence.segments, segmentChars, segmentStartTimes, segmentEndTimes);

          // Validate timings: if > 80% of words have 0 duration, it's likely broken alignment or failed mapping
          const zeroDurationCount = words.filter(w => w.start === w.end).length;
          const isInvalid = words.length > 2 && (zeroDurationCount / words.length > 0.8);

          if (isInvalid || words.length === 0) {
            console.warn(`Creating fallback timings for sentence ${sentence.id} due to invalid alignment data`);
            words = distributeTimings(sentence.segments, startTime, endTime);
          }
        } else {
          words = extractWordTimings(segmentChars, segmentStartTimes, segmentEndTimes);
        }
      }

      segments.push({
        sentenceId: sentence.id,
        text: sentence.text,
        participantRole: sentence.participantRole,
        startTime,
        endTime,
        words,
      });

      if (endTime > totalDuration) {
        totalDuration = endTime;
      }
    }

    return {
      audioBuffer,
      alignment: {
        segments,
        totalDuration,
      },
    };
  } catch (error: any) {
    // If convertWithTimestamps fails, fall back to regular convert
    console.warn('textToDialogue.convertWithTimestamps failed, falling back to convert:', error.message);

    const audioStream = await client.textToDialogue.convert({
      inputs,
      modelId: 'eleven_v3',
    });

    const audioBuffer = await streamToBuffer(audioStream);

    // Create basic alignment without word timings
    const segments: DialogueSegment[] = sortedSentences.map(sentence => ({
      sentenceId: sentence.id,
      text: sentence.text,
      participantRole: sentence.participantRole,
      startTime: 0,
      endTime: 0,
      words: [],
    }));

    return {
      audioBuffer,
      alignment: {
        segments,
        totalDuration: 0,
      },
    };
  }
}

/**
 * Get available tones for emotional delivery
 */
export function getAvailableTones(): string[] {
  return [
    'cheerfully',
    'sadly',
    'angrily',
    'excitedly',
    'calmly',
    'nervously',
    'sarcastically',
    'whispering',
    'shouting',
    'warmly',
    'coldly',
    'mysteriously',
    'playfully',
  ];
}

/**
 * Get available emotions for delivery
 */
export function getAvailableEmotions(): string[] {
  return [
    'happy',
    'sad',
    'angry',
    'surprised',
    'fearful',
    'disgusted',
    'neutral',
    'excited',
    'anxious',
    'confident',
    'curious',
    'tired',
  ];
}
