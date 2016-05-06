nounfinder
==================

Extracts nouns from chunks of text, using the [Wordnik API](http://developer.wordnik.com/docs.html).

In version 2.0+, it's more strict. If a word has multiple uses, it only counts word as a noun if the most common usage (according to Wordnik) is as a noun.

Installation
------------

    npm install nounfinder

Usage
-----

    var createNounfinder = require('nounfinder');
    var nounfinder = createNounfinder({
      wordnikAPIKey: 'kljhasdfkjahsdlfiq89243rsdhflksjdfhaskjhdf982kjhd'
    });

    var text = 'During this work, the street will be closed to motorists, except for abutters.';
    nounfinder.getNounsFromText(text, function done(error, nouns) {
      console.log(nouns);
    });

Output:

    [
      'work',
      'street',
      'will',
      'motorist',
      'abutter'
    ]

    nounfinder.filterNounsForInterestingness(nouns, 100, 
      function done(error, interestingNouns) {
        console.log(interestingNouns);
      }
    );

Output:

    [
      'motorist',
      'abutter'
    ]

The second parameter to `filterNounsForInterestingness` is a number that indicates how uncommon a word needs to be to be considered "interesting". The lower the number, the more uncommon the word needs to be.

Tests
-----

First, create a `config.js` file in the root directory that has your Wordnik API like this:

    module.exports = {
      wordnikAPIKey: 'kljhasdfkjahsdlfiq89243rsdhflksjdfhaskjhdf982kjhd'
    };

Then, run tests with `make test`.

License
-------

MIT.
