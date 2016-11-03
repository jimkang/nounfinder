var createWordnok = require('wordnok').createWordnok;
var _ = require('lodash');
var canonicalizer = require('canonicalizer');
var createIsCool = require('iscool');
var cardinalNumbers = require('./cardinalnumbers');
var isEmoji = require('is-emoji');
var emojiSource = require('emojisource');

var nounFamily = ['noun', 'pronoun'];

var isCool = createIsCool();

function createNounfinder(opts) {
  if (!opts || !opts.wordnikAPIKey) {
    throw new Error('Cannot created nounfinder without opts.wordnikAPIKey');
  }

  var wordnok = createWordnok({
    apiKey: opts.wordnikAPIKey,
    logger: opts.logger || console,
    memoizeServerPort: opts.memoizeServerPort || undefined,
    onDisconnect: opts.onDisconnect || undefined
  });

  function getNounsFromText(text, done) {
    var emojiNouns = _.uniq(getEmojiFromText(text));
    var nonEmojiText = _.without(text.split(''), emojiNouns).join('');
    getNounsFromWords(wordsFromText(nonEmojiText), addEmojiNouns);

    function addEmojiNouns(error, nouns) {
      if (error) {
        done(error);
      }
      else {
        done(null, nouns.concat(emojiNouns));
      }
    }
  }

  function getNounsFromWords(incomingWords, done) {
    var words = getWorthwhileWordsFromList(incomingWords);
    words = _.uniq(words.map(function lower(s) { return s.toLowerCase(); }));
    words = words.filter(wordIsCorrectLength);
    words = words.filter(isCool);
    words = words.filter(wordIsNotANumeral);
    words = words.filter(wordIsNotACardinalNumber);

    wordnok.getPartsOfSpeechForMultipleWords(words, filterToNouns);

    function filterToNouns(error, partsOfSpeech) {
      function couldBeNoun(word, i) {
        var couldBe = false;

        if (partsOfSpeech.length < 1) {
          // If there's no parts of speech, we'll assume it's a new weird noun Wordnik
          // doesn't know.
          couldBe = true;
        }
        // But if the partsOfSpeech has a list of parts of speech for this word
        // and that list has at least one element...
        else if (partsOfSpeech[i].length > 0 &&
          // ...and the first element (the most common usage for the word) has a part of
          // part of speech in the noun family (nouns, pronouns), then we'll count it as a noun.
          nounFamily.indexOf(partsOfSpeech[i][0]) !== -1) {

          couldBe = true;
        }
        return couldBe;
      }

      if (!error) {
        var nouns = [];
        if (Array.isArray(partsOfSpeech)) {
          nouns = words.filter(couldBeNoun);
        }
      }

      done(error, getSingularFormsOfWords(nouns));
    }
  }

  function getSingularFormsOfWords(words) {
    return words.map(getSingular);
  }

function getSingular(word) {
    var forms = canonicalizer.getSingularAndPluralForms(word);
    return forms[0];
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

  function wordsFromText(text) {
    var words = text.split(/[ ":.,;!?#]/);
    return _.compact(words);
  }

  function getWorthwhileWordsFromList(words) {
    var filteredWords = [];
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
    return isNaN(+getSingular(word));
  }

  function wordIsNotACardinalNumber(word) {
    return cardinalNumbers.indexOf(getSingular(word)) === -1;
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
    getNounsFromWords: getNounsFromWords,
    filterNounsForInterestingness: filterNounsForInterestingness,
    getFrequenciesForCachedNouns: getFrequenciesForCachedNouns
  };
}

module.exports = createNounfinder;
