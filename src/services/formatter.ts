import type { Block, AIMode } from '@/store/notesStore';

// ─── Unique ID ────────────────────────────────────────────────────────────────
let idCounter = 0;
const uid = () => `block-${Date.now()}-${++idCounter}`;

// ─── Word lists ───────────────────────────────────────────────────────────────
const ACTION_VERBS = [
  'finalize', 'schedule', 'review', 'complete', 'send', 'prepare', 'create',
  'update', 'follow up', 'check', 'confirm', 'submit', 'organize', 'plan',
  'assign', 'draft', 'approve', 'test', 'fix', 'deploy', 'implement', 'launch',
  'reach out', 'make sure', 'ensure', 'coordinate', 'discuss', 'present',
  'analyze', 'investigate', 'resolve', 'address', 'handle',
];
const URGENCY_WORDS = [
  'urgent', 'asap', 'critical', 'important', 'deadline', 'overdue',
  'immediately', 'priority', 'warning', 'risk', 'blocker', 'must', 'required',
  'mandatory', 'essential', 'crucial', 'emergency',
];
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'that', 'this',
  'these', 'those', 'they', 'them', 'their', 'there', 'then', 'than',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'how', 'why',
  'also', 'some', 'into', 'more', 'very', 'just', 'over', 'such',
  'make', 'like', 'each', 'its', 'our', 'your', 'my', 'we', 'i', 'he',
  'she', 'it', 'you', 'not', 'no', 'so', 'as', 'if', 'up', 'out',
  'about', 'after', 'before', 'during', 'through', 'between', 'among',
]);

// ─── Text splitting ───────────────────────────────────────────────────────────
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── TF-IDF sentence scoring ──────────────────────────────────────────────────
function scoreSentences(sentences: string[]): number[] {
  if (sentences.length === 0) return [];

  // Term frequency per sentence
  const sentenceTokens = sentences.map(tokenize);

  // Document frequency (how many sentences contain each word)
  const df: Record<string, number> = {};
  sentenceTokens.forEach(tokens => {
    const seen = new Set(tokens);
    seen.forEach(w => { df[w] = (df[w] || 0) + 1; });
  });

  const N = sentences.length;

  return sentenceTokens.map((tokens, i) => {
    if (tokens.length === 0) return 0;

    // TF-IDF sum for this sentence
    const tf: Record<string, number> = {};
    tokens.forEach(w => { tf[w] = (tf[w] || 0) + 1; });

    let tfidfScore = 0;
    Object.entries(tf).forEach(([w, freq]) => {
      const idf = Math.log((N + 1) / (df[w] + 1)) + 1;
      tfidfScore += (freq / tokens.length) * idf;
    });

    // Position weight: first 20% and last 10% of text get a boost
    const posRatio = i / N;
    const posWeight =
      posRatio <= 0.2 ? 1.4 :   // intro
      posRatio >= 0.9 ? 1.2 :   // conclusion
      1.0;

    // Length penalty: very short or very long sentences score lower
    const lenPenalty = tokens.length < 4 ? 0.6 : tokens.length > 40 ? 0.8 : 1.0;

    return tfidfScore * posWeight * lenPenalty;
  });
}

// ─── Classify a sentence ──────────────────────────────────────────────────────
function isActionItem(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return ACTION_VERBS.some(v => lower.includes(v));
}

function isWarning(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return URGENCY_WORDS.some(w => lower.includes(w));
}

// ─── Key phrase extraction (top terms) ───────────────────────────────────────
function extractTags(text: string): string[] {
  const tokens = tokenize(text);
  const freq: Record<string, number> = {};
  tokens.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .filter(([, c]) => c >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

// ─── Title from highest-scored sentence ──────────────────────────────────────
function generateTitle(sentences: string[], scores: number[]): string {
  if (sentences.length === 0) return 'Untitled Note';
  const best = scores.indexOf(Math.max(...scores));
  const candidate = sentences[best] || sentences[0];
  return candidate.length > 55 ? candidate.slice(0, 52) + '…' : candidate;
}

// ─── Detect note intent ───────────────────────────────────────────────────────
function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('meeting') || lower.includes('agenda') || lower.includes('minutes')) return 'meeting';
  if (lower.includes('study') || lower.includes('learn') || lower.includes('chapter') || lower.includes('exam')) return 'study';
  if (lower.includes('idea') || lower.includes('brainstorm') || lower.includes('concept')) return 'brainstorm';
  if (ACTION_VERBS.some(v => lower.includes(v))) return 'tasks';
  return 'general';
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function processText(
  rawText: string,
  mode: AIMode,
): { blocks: Block[]; tags: string[]; title: string } {
  const sentences = splitSentences(rawText);
  if (sentences.length === 0) {
    return {
      blocks: [{ id: uid(), type: 'paragraph', content: rawText.trim() || '(empty)' }],
      tags: [],
      title: 'Untitled Note',
    };
  }

  const scores = scoreSentences(sentences);
  const tags = extractTags(rawText);
  const title = generateTitle(sentences, scores);
  const intent = detectIntent(rawText);
  const blocks: Block[] = [];

  // ── How many sentences to keep in summary ────────────────────────────────
  //  simple  → 2 sentences
  //  detailed→ 3 sentences
  //  action  → 2 sentences
  //  study   → 4 sentences (keep more context)
  const summaryCount = mode === 'study' ? 4 : mode === 'detailed' ? 3 : 2;

  // Pick the top-N ranked sentences, preserving original order
  const ranked = sentences
    .map((s, i) => ({ s, score: scores[i], i }))
    .sort((a, b) => b.score - a.score);

  const summaryIndices = new Set(
    ranked.slice(0, summaryCount).map(r => r.i).sort((a, b) => a - b),
  );

  const summarySentences = [...summaryIndices].map(i => sentences[i]);

  // ── Summary block ─────────────────────────────────────────────────────────
  if (summarySentences.length > 0) {
    blocks.push({
      id: uid(),
      type: 'summary',
      content: summarySentences.join(' '),
    });
  }

  // ── Warning blocks (sentences with urgency words) ─────────────────────────
  const warnings = sentences.filter(isWarning);
  const usedInWarning = new Set<string>();
  warnings.forEach(w => {
    blocks.push({ id: uid(), type: 'warning', content: w });
    usedInWarning.add(w);
  });

  // ── Tags block ────────────────────────────────────────────────────────────
  if (tags.length > 0) {
    blocks.push({ id: uid(), type: 'tag-group', content: tags.join(', ') });
  }

  // ── Body: select remaining sentences by mode ──────────────────────────────
  // "simple"  → only top 40% of sentences as bullets (concise)
  // "detailed"→ top 70% as paragraphs grouped by topic
  // "action"  → only action items
  // "study"   → top 60% with headings every ~3 sentences

  const usedInSummary = new Set([...summaryIndices].map(i => sentences[i]));

  // Filter out sentences already shown in summary or warnings
  const bodyPool = sentences.filter(
    s => !usedInSummary.has(s) && !usedInWarning.has(s),
  );

  if (mode === 'action') {
    // ── Action mode: only tasks ─────────────────────────────────────────────
    const actionItems = sentences.filter(isActionItem);
    if (actionItems.length > 0) {
      blocks.push({ id: uid(), type: 'heading', content: '✅ Action Items' });
      actionItems.forEach(s => {
        blocks.push({ id: uid(), type: 'task', content: s, completed: false });
      });
    } else {
      // Nothing matched — fall back to top sentences
      ranked.slice(0, 5).forEach(({ s }) => {
        blocks.push({ id: uid(), type: 'bullet', content: s });
      });
    }
  } else if (mode === 'simple') {
    // ── Simple mode: bullet list of top sentences only (no repeats) ──────────
    const keepCount = Math.max(2, Math.ceil(bodyPool.length * 0.4));
    const bodyScores = bodyPool.map((s, i) => ({
      s,
      score: scores[sentences.indexOf(s)] ?? 0,
      origIdx: sentences.indexOf(s),
    }));
    const keptSimple = bodyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, keepCount)
      .sort((a, b) => a.origIdx - b.origIdx);

    if (keptSimple.length > 0) {
      blocks.push({ id: uid(), type: 'heading', content: 'Key Points' });
      keptSimple.forEach(({ s }) => {
        blocks.push({ id: uid(), type: 'bullet', content: s });
      });
    }

    // Also show action items as tasks
    const simpleActions = bodyPool.filter(isActionItem);
    if (simpleActions.length > 0) {
      blocks.push({ id: uid(), type: 'heading', content: '✅ Action Items' });
      simpleActions.forEach(s => {
        blocks.push({ id: uid(), type: 'task', content: s, completed: false });
      });
    }
  } else if (mode === 'detailed') {
    // ── Detailed mode: keep 70%, group into thematic sections ────────────────
    const keepCount = Math.max(3, Math.ceil(bodyPool.length * 0.7));
    const bodyScores = bodyPool.map(s => ({
      s,
      score: scores[sentences.indexOf(s)] ?? 0,
      origIdx: sentences.indexOf(s),
    }));
    const kept = bodyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, keepCount)
      .sort((a, b) => a.origIdx - b.origIdx)
      .map(x => x.s);

    // Group into clusters of ~4
    const clusterSize = 4;
    for (let i = 0; i < kept.length; i += clusterSize) {
      const cluster = kept.slice(i, i + clusterSize);
      const headingText = cluster[0].length > 55
        ? cluster[0].slice(0, 52) + '…'
        : cluster[0];
      blocks.push({ id: uid(), type: 'heading', content: headingText });
      cluster.slice(1).forEach(s => {
        if (isActionItem(s)) {
          blocks.push({ id: uid(), type: 'task', content: s, completed: false });
        } else {
          blocks.push({ id: uid(), type: 'paragraph', content: s });
        }
      });
    }
  } else if (mode === 'study') {
    // ── Study mode: keep 60%, add headings + bullets for easy review ─────────
    const keepCount = Math.max(3, Math.ceil(bodyPool.length * 0.6));
    const bodyScores = bodyPool.map(s => ({
      s,
      score: scores[sentences.indexOf(s)] ?? 0,
      origIdx: sentences.indexOf(s),
    }));
    const kept = bodyScores
      .sort((a, b) => b.score - a.score)
      .slice(0, keepCount)
      .sort((a, b) => a.origIdx - b.origIdx)
      .map(x => x.s);

    if (intent === 'meeting') {
      blocks.push({ id: uid(), type: 'heading', content: '📋 Discussion Points' });
    } else if (intent === 'study') {
      blocks.push({ id: uid(), type: 'heading', content: '📚 Key Concepts' });
    } else {
      blocks.push({ id: uid(), type: 'heading', content: '🗒️ Main Points' });
    }

    kept.forEach(s => {
      blocks.push({ id: uid(), type: 'bullet', content: s });
    });

    // Action items at the bottom
    const studyActions = sentences.filter(isActionItem);
    if (studyActions.length > 0) {
      blocks.push({ id: uid(), type: 'heading', content: '✅ To-Do' });
      studyActions.forEach(s => {
        blocks.push({ id: uid(), type: 'task', content: s, completed: false });
      });
    }
  }

  return { blocks, tags, title };
}
