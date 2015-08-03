MOCHA = node_modules/mocha/bin/MOCHA

test:
	$(MOCHA) --ui tdd tests/nounfinder-tests.js

pushall:
	git push origin master && npm publish
