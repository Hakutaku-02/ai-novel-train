// Quick test for split-chapters-preview suggestion logic
const fs = require('fs');

function generateContent(n) {
  let s = '';
  for (let i = 1; i <= n; i++) {
    s += `第${i}章 标题 ${i}\n`;
    s += `正文内容示例，包含一些文本但不包含章节标题的标注。\n\n`;
  }
  return s;
}

const content = generateContent(150);
// Show some context around chapter 100
const idx100 = content.indexOf('第100章');
console.log('index of 第100章:', idx100);
console.log('context around 第100章:', content.slice(Math.max(0, idx100 - 30), idx100 + 30));
const regex_pattern = '第\\d{1,2}章';

const regex = new RegExp(regex_pattern, 'gm');
const matches = [...content.matchAll(regex)];
console.log('matches with original regex:', matches.length);

const generalized = regex_pattern.replace(/\\d\{\d+(?:,\\d+)?\}/g, '\\d+');
const genRegex = new RegExp(generalized, 'gm');
const genMatches = [...content.matchAll(genRegex)];
console.log('matches with generalized regex:', genMatches.length);

if (genMatches.length > matches.length) {
  console.log('Suggestion available:', generalized);
} else {
  console.log('No suggestion needed');
}
 console.log('First 10 matched titles by generalized regex:');
 genMatches.slice(0, 10).forEach((m, i) => console.log(i + 1, m[0]));
console.log('Matched indices around 90-110:');
genMatches.slice(85, 115).forEach((m, i) => console.log(86 + i, m[0]));
