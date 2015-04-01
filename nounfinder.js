var createWordnok = require('wordnok').createWordnok;
var _ = require('lodash');
var canonicalizer = require('canonicalizer');
var createIsCool = require('iscool');
var cardinalNumbers = require('./cardinalnumbers');
var isEmoji = require('is-emoji');
var emojiSource = require('emojisource');

var isCool = createIsCool({
  logger: console
});

function createNounfinder(opts) {
  if (!opts || !opts.wordnikAPIKey) {
    throw new Error('Cannot created nounfinder without opts.wordnikAPIKey');
  }

  var wordnok = createWordnok({
    apiKey: opts.wordnikAPIKey,
    logger: opts.logger || console,
    memoizeServerPort: opts.memoizeServerPort || undefined
  });

  function getNounsFromText(text, done) {
    var emojiNouns = _.uniq(getEmojiFromText(text));
    var nonEmojiText = _.without(text.split(''), emojiNouns).join('');

    var words = getSingularFormsOfWords(worthwhileWordsFromText(nonEmojiText));
    words = _.uniq(words.map(function lower(s) { return s.toLowerCase(); }));
    words = words.filter(wordIsCorrectLength);
    words = words.filter(isCool);
    words = words.filter(wordIsNotANumeral);
    words = words.filter(wordIsNotACardinalNumber);

    wordnok.getPartsOfSpeechForMultipleWords(words, filterToNouns);

    function filterToNouns(error, partsOfSpeech) {
      function couldBeNoun(word, i) {
        return partsOfSpeech.length > i &&
          typeof partsOfSpeech[i].indexOf === 'function' &&
          partsOfSpeech[i].indexOf('noun') !== -1;
      }

      if (!error) {
        var nouns = [];
        if (Array.isArray(partsOfSpeech)) {
          nouns = words.filter(couldBeNoun);
        }
      }

      done(error, nouns.concat(emojiNouns));
    }
  }

  function getSingularFormsOfWords(words) {
    return words.map(function getSingular(word) {
      var forms = canonicalizer.getSingularAndPluralForms(word);
      return forms[0];
    });
  }

  function filterNounsForInterestingness(nouns, maxFrequency, done) {
    var addIndexIfUnder = _.curry(addIndexIfFreqIsUnderMax)(maxFrequency);

    function nounAtIndex(index) {
      return nouns[index];
    }

    var emojiNouns = nouns.filter(isEmoji)
      .filter(emojiSource.emojiValueIsOKAsATopic);

    nouns = nouns.filter(function isNotEmoji(noun) {
      return !isEmoji(noun);
    });

    wordnok.getWordFrequencies(nouns, filterByFrequency);

    function filterByFrequency(error, frequencies) {
      if (error) {
        done(error);
      }
      else {
        var indexesOfFreqsUnderMax = frequencies.reduce(addIndexIfUnder, []);
        var foundNouns = indexesOfFreqsUnderMax.map(nounAtIndex);

        done(null, foundNouns.concat(emojiNouns));
      }
    }
  }

  function addIndexIfFreqIsUnderMax(maxFreq, indexesUnderMax, freq, index) {
    if (freq < maxFreq) {
      indexesUnderMax.push(index);
    }
    return indexesUnderMax;
  }

  function worthwhileWordsFromText(text) {
    var words = text.split(/[ ":.,;!?#]/);
    var filteredWords = [];
    words = _.compact(words);
    if (words.length > 0) {
      filteredWords = words.filter(isWorthCheckingForNounHood);
    }
    return filteredWords;
  }

  function isWorthCheckingForNounHood(word) {
    return word.length > 1 && wordDoesNotStartWithAtSymbol(word);
  }

  function wordDoesNotStartWithAtSymbol(word) {
    return word.indexOf('@') === -1;
  }

  function wordIsNotANumeral(word) {
    return isNaN(+word);
  }

  function wordIsNotACardinalNumber(word) {
    return cardinalNumbers.indexOf(word) === -1;
  }

  function wordIsCorrectLength(word) {
    return wordIsAtLeastTwoCharacters(word) || isEmoji(word);
  }

  function wordIsAtLeastTwoCharacters(word) {
    return word.length > 1;
  }

  function getFrequenciesForCachedNouns() {
    return frequenciesForNouns;
  }

  // From http://crocodillon.com/blog/parsing-emoji-unicode-in-javascript.
  var emojiSurrogateRangeDefs = [
    {
      lead: '\ud83c',
      trailRange: ['\udf00', '\udfff']
    },
    {
      lead: '\ud83d',
      trailRange: ['\udc00', '\ude4f']
    },
    {
      lead: '\ud83d',
      trailRange: ['\ude80', '\udeff']
    }
  ];

  function isEmojiSurrogatePair(leadChar, trailingChar) {
    return emojiSurrogateRangeDefs.some(function charCodeIsInRange(rangeDef) {
      return leadChar === rangeDef.lead &&
        trailingChar >= rangeDef.trailRange[0] &&
        trailingChar <= rangeDef.trailRange[1];
    });
  }

  function getEmojiFromText(text) {
    var emojiArray = [];
    for (var i = 0; i < text.length - 1; ++i) {
      var leadChar = text[i];
      var trailChar = text[i + 1];
      if (isEmojiSurrogatePair(leadChar, trailChar)) {
        emojiArray.push(text.substr(i, 2));
      }
    }
    return emojiArray;
  }

  return {
    getNounsFromText: getNounsFromText,
    filterNounsForInterestingness: filterNounsForInterestingness,
    getFrequenciesForCachedNouns: getFrequenciesForCachedNouns
  };
}

module.exports = createNounfinder;
