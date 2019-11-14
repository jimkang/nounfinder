MOCHA = node_modules/.bin/mocha

test:
	$(MOCHA) --ui tdd tests/nounfinder-tests.js
	node tests/get-nouns-from-words-tests.js

pushall:
	git push origin master && npm publish

update-iscool:
	npm update --save iscool
	git commit -a -m"Updated iscool."
	npm version patch
	make pushall
