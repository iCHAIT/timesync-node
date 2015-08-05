// test/helpers.js

var helpers = require('../src/helpers');

module.exports = function(expect) {
    describe('checkUser', function() {
        it('Returns user ID if username == user', function(done) {
            helpers.checkUser('tschuy', 'tschuy').then(function(userID) {
                expect(userID).to.equal(2);
                done();
            });
        });
        // Later: Include a test that checks if username is admin
        it('Returns false if username !== user', function(done) {
            helpers.checkUser('notauser', 'tschuy').then()
            .catch(function(err) {
                expect(err).to.be.an('undefined');
                done();
            });
        });
    });

    describe('validateSlug', function() {
        it('returns true for proper slug', function(done) {
            expect(helpers.validateSlug('kitten')).to.be.true;
            done();
        });

        it('returns true for proper slug with hyphen', function(done) {
            expect(helpers.validateSlug('kitten-be-cool')).to.be.true;
            done();
        });

        it('returns true for proper slug with hyphens and numbers',
        function(done) {
            expect(helpers.validateSlug('a1b2-c3')).to.be.true;
            done();
        });

        it('returns false for empty string', function(done) {
            expect(helpers.validateSlug('')).to.be.false;
            done();
        });

        it('returns false for null input', function(done) {
            expect(helpers.validateSlug(null)).to.be.false;
            done();
        });

        it('returns false for undefined input', function(done) {
            expect(helpers.validateSlug(undefined)).to.be.false;
            done();
        });

        it('returns false for slugs starting with numbers', function(done) {
            expect(helpers.validateSlug('123abc')).to.be.false;
            done();
        });

        it('returns false for slugs with multiple hyphens in a row',
        function(done) {
            expect(helpers.validateSlug('a1b2--c3')).to.be.false;
            done();
        });
    });
};
