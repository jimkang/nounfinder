var test = require('tape');
var createNounfinder = require('../nounfinder');
var config = require('../config');
var assertNoError = require('assert-no-error');

var testCases = [
  {
    words: [
      'Facebook',
      'running',
      'studies',
      'to',
      'see',
      'if',
      'it',
      'can',
      'manipulate',
      'users\'',
      'emotional',
      'states',
      'by',
      'skewing',
      'their',
      'feeds'    
    ],
    expected: [
      'facebook',
      'running',
      'it',
      'state',
      'feed'
    ]
  },
  {
    words: [
      'Hello',
      'dystopia',
      'You\'re',
      'a',
      'little',
      'early',
      'but',
      'I\'ve',
      'been',
      'expecting',
      'you'
    ],
    expected: [
      'dystopium',
      'you'
    ]
  },
  {
    words: [
      'w/e',
      'tl;dr',
      'capitalism',
      'ruins',
      'everything',
      'i’m',
      'going',
      'to',
      'bed',
    ],
    expected: [
      'capitalism',
      'ruin',
      'everything',
      'going',
      'bed'    
    ]
  }
];

var nounfinder = createNounfinder({
  wordnikAPIKey: config.wordnikAPIKey
});

testCases.forEach(runTest);

function runTest(testCase) {
  test(testCase.words.join(' '), getNounsTest);

  function getNounsTest(t) {
    nounfinder.getNounsFromWords(testCase.words, checkNouns);

    function checkNouns(error, nouns) {
      assertNoError(t.ok, error, 'No error while getting nouns.');
      t.deepEqual(nouns, testCase.expected, 'Correct nouns found.');
      t.end();
    }
  }
}
