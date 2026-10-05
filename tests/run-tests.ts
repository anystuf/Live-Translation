import { createFrameCoalescer } from '../src/lib/frameCoalescer';
import { normalizeVietnameseEnglishTerminology } from '../src/lib/vietnameseNormalizer';
import { protectProperNames } from '../src/lib/properNameCorrections';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

async function run() {
  const coalescedValues: string[] = [];
  const coalescer = createFrameCoalescer<string>((value) => coalescedValues.push(value));
  coalescer.push('first');
  coalescer.push('second');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(coalescedValues.length === 1 && coalescedValues[0] === 'second', 'frame coalescer keeps the latest value');

  // SGAs
  let res = normalizeVietnameseEnglishTerminology('ess gee ayz', { selectedAccentProfile: 'mixed-unknown', currentText: 'ess gee ayz' });
  assert(res.normalizedText.includes('SGA') || res.normalizedText.includes('SGAs'), 'SGAs: ess gee ayz normalized');

  res = normalizeVietnameseEnglishTerminology('ét gi ây', { selectedAccentProfile: 'southern-vietnamese', currentText: 'ét gi ây' });
  assert(res.normalizedText.includes('SGA') || res.normalizedText.includes('SGAs'), 'SGAs: ét gi ây normalized');

  res = normalizeVietnameseEnglishTerminology('ét chi ây', { selectedAccentProfile: 'mixed-unknown', currentText: 'ét chi ây' });
  assert(res.normalizedText.includes('SGA') || res.normalizedText.includes('SGAs'), 'SGAs: ét chi ây normalized');

  res = normalizeVietnameseEnglishTerminology('êts chi ây', { selectedAccentProfile: 'mixed-unknown', currentText: 'êts chi ây' });
  assert(res.normalizedText.includes('SGA') || res.normalizedText.includes('SGAs'), 'SGAs: êts chi ây normalized');

  // road map / role map
  res = normalizeVietnameseEnglishTerminology('we discussed the road map for product', { selectedAccentProfile: 'mixed-unknown', previousText: '', currentText: 'road map', nextText: 'for product' });
  assert(res.normalizedText.includes('roadmap'), 'road map normalized to roadmap');

  res = normalizeVietnameseEnglishTerminology('this is a role map', { selectedAccentProfile: 'mixed-unknown', currentText: 'role map' });
  // ambiguous: should not auto-correct to roadmap without context
  assert(!res.normalizedText.includes('roadmap') || res.suggestions.length > 0, 'role map not auto-changed without strong context');

  // cohort
  res = normalizeVietnameseEnglishTerminology('co hort two', { selectedAccentProfile: 'mixed-unknown', currentText: 'co hort two' });
  assert(res.normalizedText.includes('cohort') || res.suggestions.length > 0, 'co hort two normalized or suggested');

  // painpoint
  res = normalizeVietnameseEnglishTerminology('we found a painpoint in the user flow', { selectedAccentProfile: 'mixed-unknown', currentText: 'painpoint' });
  assert(res.normalizedText.includes('pain point'), 'painpoint normalized');

  const chamira = protectProperNames('Xin chào Chàm', 'Hello Idigo');
  assert(chamira.source === 'Xin chào Chamira', 'Chàm corrected to protected name Chamira');
  assert(chamira.target === 'Hello Chamira', 'Idigo corrected to protected name Chamira');

  const indigoColour = protectProperNames('Tôi thích màu chàm', 'I like indigo');
  assert(indigoColour.source === 'Tôi thích màu chàm', 'unpaired chàm is not treated as a name');

  console.log('Finished tests.');
}

void run();
