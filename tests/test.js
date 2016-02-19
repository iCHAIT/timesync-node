'use strict';

const requestBuilder = require('request');
const expect = require('chai').expect;
const SqlFixtures = require('sql-fixtures');

const request = requestBuilder.defaults({encoding: null});
const testData = require('./fixtures/test_data');
const knexfile = require('../knexfile');
const knex = require('knex')(knexfile[process.env.NODE_ENV]);

const port = process.env.PORT || 8000;
const baseUrl = 'http://localhost:' + port + '/v1/';

const app = require('../src/app');
let trx;

const user = 'tschuy';
const password = 'password';

const getAPIToken = function() {
  const requestOptions = {
    url: baseUrl + 'login',
    json: true,
  };
  requestOptions.body = {
    auth: {
      type: 'password',
      username: user,
      password: password,
    },
  };
  return new Promise(function(resolve) {
    request.post(requestOptions, function(err, res, body) {
      expect(err).to.be.a('null');
      expect(res.statusCode).to.equal(200);

      resolve(body.token);
    });
  });
};

const copyJsonObject = function(obj) {
  // This allows us to change object properties
  // without effecting other tests
  return JSON.parse(JSON.stringify(obj));
};

const transact = function(done) {
  knex.transaction(function(newTrx) {
    trx = newTrx;
    app.set('knex', trx);

    const fixtureCreator = new SqlFixtures(trx);
    if (process.env.NODE_ENV === 'mocha_sqlite') {
      fixtureCreator.create(testData).then(function() {
        done();
      });
    } else {
      fixtureCreator.create(testData).then(function() {
        newTrx.raw("SELECT setval('times_id_seq', " +
        '(SELECT MAX(id) FROM times));').then(function() {
          newTrx.raw("SELECT setval('activities_id_seq', " +
          '(SELECT MAX(id) FROM activities));').then(function() {
            newTrx.raw("SELECT setval('projects_id_seq', " +
            '(SELECT MAX(id) FROM projects));').then(function() {
              newTrx.raw("SELECT setval('timesactivities_id_seq', " +
              '(SELECT MAX(id) FROM timesactivities));').then(function() {
                newTrx.raw("SELECT setval('projectslugs_id_seq', " +
                '(SELECT MAX(id) FROM projectslugs));').then(function() {
                  done();
                });
              });
            });
          });
        });
      });
    }
  }).catch(function(e) {
    // only swallow the test rollback error
    if (e !== 'test rollback') {
      throw e;
    }
  });
};

const endTransact = function(done) {
  trx.rollback('test rollback').then(function() {
    done();
  });
};

describe('Endpoints', function() {
  this.timeout(1000);
  beforeEach(transact);
  afterEach(endTransact);

  before(function(done) {
    knex.migrate.latest().then(function() {
      done();
    });
  });

  require('./times')(expect, request, baseUrl, getAPIToken, copyJsonObject, user, password);
  require('./projects')(expect, request, baseUrl, getAPIToken, copyJsonObject, user, password);
  require('./activities')(expect, request, baseUrl, getAPIToken, copyJsonObject);
});

describe('Errors', function() {
  require('./errors')(expect);
});

describe('Helpers', function() {
  this.timeout(1000);
  beforeEach(transact);
  afterEach(endTransact);

  before(function(done) {
    knex.migrate.latest().then(function() {
      done();
    });
  });

  require('./helpers')(expect, app);
});

describe('Login', function() {
  this.timeout(1000);
  beforeEach(transact);
  afterEach(endTransact);

  const localPassport = require('../src/auth/local')(app);
  const ldapPassport = require('../src/auth/ldap')(app);

  require('./login/password')(expect, localPassport);
  require('./login/ldap')(expect, ldapPassport);
  require('./login/token')(expect, request, baseUrl);
});
