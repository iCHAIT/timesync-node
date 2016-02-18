'use strict';

function copyJsonObject(obj) {
  // This allows us to change object properties
  // without affecting other tests
  return JSON.parse(JSON.stringify(obj));
}

let user = 'tschuy';
let password = 'password';

module.exports = function(expect, request, baseUrl) {
  function getAPIToken() {
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
        expect(err).to.equal(null);
        expect(res.statusCode).to.equal(200);

        resolve(body.token);
      });
    });
  }

  const initialData = [
    {
      display_name: 'Dean Johnson',
      username: 'deanj',
      email: null,
      spectator: false,
      manager: false,
      admin: false,
      active: false,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: null,
      meta: null,
    },
    {
      display_name: 'Evan Tschuy',
      username: 'tschuy',
      email: null,
      spectator: true,
      manager: true,
      admin: true,
      active: true,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: null,
      meta: null,
    },
    {
      display_name: 'Tristan Patch',
      username: 'patcht',
      email: null,
      spectator: true,
      manager: true,
      admin: false,
      active: true,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: null,
      meta: null,
    },
    {
      display_name: 'Matthew Johnson',
      username: 'mrsj',
      email: null,
      spectator: true,
      manager: false,
      admin: false,
      active: true,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: null,
      meta: null,
    },
    {
      display_name: 'Aileen Thai',
      username: 'thai',
      email: null,
      spectator: true,
      manager: false,
      admin: false,
      active: true,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: null,
      meta: null,
    },
    {
      display_name: 'Megan Goossens',
      username: 'MaraJade',
      email: null,
      spectator: false,
      manager: false,
      admin: false,
      active: true,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: null,
      meta: null,
    },
    {
      display_name: 'Old Timer',
      username: 'timero',
      email: 'timero@example.com',
      spectator: false,
      manager: false,
      admin: false,
      active: false,
      created_at: '2014-01-01',
      updated_at: null,
      deleted_at: '2016-02-17',
      meta: 'A sample deleted user',
    },
  ];

  describe('GET /users', function() {
    it('returns all active users in the database', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users?token=' + token,
        function(err, res, body) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);

          const jsonBody = JSON.parse(body);
          const expectedResults = initialData.filter(function(data) {
            return data.deleted_at === null;
          });

          expect(jsonBody).to.deep.equal(expectedResults);

          done();
        });
      });
    });
  });

  describe('GET /users?include_deleted=true', function() {
    it('returns all active and deleted users in the database', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users?include_deleted=true&token=' + token,
        function(err, res, body) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);

          const jsonBody = JSON.parse(body);

          expect(jsonBody).to.deep.have.same.members(initialData);

          done();
        });
      });
    });

    it('ignores extra params if user specifies invalid params', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users?include_deleted=truefoo=bar&token=' +
        token,
        function(err, res, body) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);

          const jsonBody = JSON.parse(body);

          expect(jsonBody).to.deep.have.same.members(initialData);

          done();
        });
      });
    });
  });

  describe('GET /users/:usernames', function() {
    it('returns a single user by username', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users/' + initialData[0].username +
        '?token=' + token,
        function(err, res, body) {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);

          const jsonBody = JSON.parse(body);

          expect(jsonBody).to.deep.equal(initialData[0]);

          done();
        });
      });
    });

    it('returns an error if ?include_deleted is passed', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users/' + initialData[6].username +
        'include_deleted=true&token=' + token,
        function(err, res, body) {
          const jsonBody = JSON.parse(body);
          const expectedResult = {
            status: 404,
            error: 'Object not found',
            text: 'Nonexistent user',
          };

          expect(jsonBody).to.deep.equal(expectedResult);
          expect(res.statusCode).to.equal(404);
          done();
        });
      });
    });

    it('fails with an Object Not Found error', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users/notauser?token=' + token,
        function(err, res, body) {
          const jsonBody = JSON.parse(body);
          const expectedResult = {
            status: 404,
            error: 'Object not found',
            text: 'Nonexistent user',
          };

          expect(jsonBody).to.deep.equal(expectedResult);
          expect(res.statusCode).to.equal(404);
          done();
        });
      });
    });

    it('fails with an Invalid Identifier error', function(done) {
      getAPIToken().then(function(token) {
        request.get(baseUrl + 'users/!nv4l|d?token=' + token,
        function(err, res, body) {
          const jsonBody = JSON.parse(body);
          const expectedResult = {
            status: 404,
            error: 'The provided identifier was invalid',
            text: 'Expected username but received !nv4l|d',
            identifiers: ['!nv4l|d'],
          };

          expect(jsonBody).to.deep.equal(expectedResult);
          expect(res.statusCode).to.equal(404);
          done();
        });
      });
    });
  });

  describe('POST /users', function() {
    const postNewUserComplete = {
      username: 'guyn',
      display_name: 'New Guy',
      password: 'newguy1234',
      email: 'guyn@example.com',
      spectator: false,
      manager: false,
      admin: false,
      active: true,
      meta: 'Just arrived',
    };

    const getNewUserComplete = {
      username: 'guyn',
      display_name: 'New Guy',
      email: 'guyn@example.com',
      spectator: false,
      manager: false,
      admin: false,
      active: true,
      created_at: null, // Must be filled in by function because it varies
      updated_at: null,
      deleted_at: null,
      meta: 'Just arrived',
    };

    const postNewUserMinimum = {
      username: 'guyn',
      password: 'newguy1234',
    };

    const getNewUserMinimum = {
      username: 'guyn',
      display_name: null,
      email: null,
      spectator: false,
      manager: false,
      admin: false,
      active: true,
      created_at: null, // Must be filled in by function because it varies
      updated_at: null,
      deleted_at: null,
      meta: null,
    };

    const badNewUser = { // Invalid values but correct types
      username: '!nv4l|d',
      email: 'notanemail',
      created_at: '2016-02-17',
      updated_at: '2016-02-18',
      deleted_at: '2016-02-19',
    };

    const invalidNewUser = { // Wrong types
      username: [1223],
      display_name: [2334],
      password: [9876],
      email: {223: 322},
      spectator: 'yes',
      manager: 'no',
      admin: 'maybe',
      active: 'dunno',
      meta: [3.141592653],
    };

    const postArg = {
      auth: {
        type: 'token',
      },
    };

    const requestOptions = {
      url: baseUrl + 'users',
      json: true,
    };

    // Function used for validating that the object in the database
    // is in the correct state (change or unchanged based on if the POST
    // was valid)
    const checkListEndpoint = function(done, expectedResults, token) {
      // Make a get request
      request.get(requestOptions.url + '?token=' + token,
      function(err, res, body) {
        expect(err).to.equal(null);

        const jsonBody = JSON.parse(body);
        expect(jsonBody).to.deep.equal(expectedResults);

        expect(res.statusCode).to.equal(200);
        done();
      });
    };

    it('successfully creates a new user with all fields', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserComplete);

        requestOptions.body.auth.token = token;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = copyJsonObject(getNewUserComplete);
          expectedResult.created_at = body.created_at;

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(200);

          checkListEndpoint(done, initialData.concat(expectedResult), token);
        });
      });
    });

    it('successfully creates a new user with all possible nulls',
    function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = copyJsonObject(getNewUserMinimum);
          expectedResult.created_at = body.created_at;

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(200);

          checkListEndpoint(done, initialData.concat(expectedResult), token);
        });
      });
    });

    it('fails to create a new user with bad authentication', function(done) {
      const oldUser = user;
      const oldPass = password;

      user = 'notauser';
      password = 'notapass';
      getAPIToken().then(function(token) {
        user = oldUser;
        password = oldPass;

        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 401,
            error: 'Authentication Failure',
            text: 'Incorrect username or password',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(401);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with bad authorization', function(done) {
      const oldUser = user;
      const oldPass = password;

      user = 'mrsj';
      password = 'word';
      getAPIToken().then(function(token) {
        user = oldUser;
        password = oldPass;

        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 401,
            error: 'Authorization Failure',
            text: 'mrsj is not authorized to create users',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(401);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with bad username', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.username = badNewUser.username;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field username of user should be valid username but was ' +
              'sent as string',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with bad email', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.email = badNewUser.email;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field email of user should be valid email but was ' +
              'sent as string',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid display_name type',
    function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.display_name = invalidNewUser.display_name;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field display_name of user should be string but was ' +
              'sent as array',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid username type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.username = invalidNewUser.username;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field username of user should be string but was ' +
              'sent as array',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid password type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.password = invalidNewUser.password;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field password of user should be string but was ' +
              'sent as array',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid email type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.email = invalidNewUser.email;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field email of user should be string but was ' +
              'sent as object',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid spectator type',
    function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.spectator = invalidNewUser.spectator;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field spectator of user should be boolean but was ' +
              'sent as string',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid manager type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.manager = invalidNewUser.manager;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field manager of user should be boolean but was ' +
              'sent as string',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid admin type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.admin = invalidNewUser.admin;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field admin of user should be boolean but was ' +
              'sent as string',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid active type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.active = invalidNewUser.active;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field active of user should be boolean but was ' +
              'sent as string',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with invalid meta type', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.meta = invalidNewUser.meta;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'Field meta of user should be string but was ' +
              'sent as array',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with explicit created_at', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.created_at = badNewUser.created_at;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'user does not have a created_at field',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with explicit updated_at', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.updated_at = badNewUser.updated_at;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'user does not have a updated_at field',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with explicit deleted_at', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        requestOptions.body.object.deleted_at = badNewUser.deleted_at;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'user does not have a deleted_at field',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with no username', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        delete requestOptions.body.object.username;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'The user is missing a username',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });

    it('fails to create a new user with no password', function(done) {
      getAPIToken().then(function(token) {
        requestOptions.body = copyJsonObject(postArg);
        requestOptions.body.object = copyJsonObject(postNewUserMinimum);

        requestOptions.body.auth.token = token;

        delete requestOptions.body.object.password;

        request.post(requestOptions, function(err, res, body) {
          expect(err).to.equal(null);

          const expectedResult = {
            status: 400,
            error: 'Bad object',
            text: 'The user is missing a password',
          };

          expect(body).to.deep.equal(expectedResult);

          expect(res.statusCode).to.equal(400);

          checkListEndpoint(done, initialData, token);
        });
      });
    });
  });

  describe('POST /users/:username', function() {
    it("successfully updates a user's username, display name, password, " +
       'email, and meta', function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's username", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's display name", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's password", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's email", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's meta", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's spectator status", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's manager status", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's admin status", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("successfully updates a user's active status", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with bad authentication", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with bad authorization", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with bad values", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with bad username", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with bad password", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with bad email", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid username type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid display name type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid password type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid email type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid spectator type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid manager type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid admin type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid active type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with invalid meta type", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with explicit created_at", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with explicit updated_at", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it("doesn't update a user with explicit deleted_at", function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });
  });

  describe('DELETE /users/:username', function() {
    it('successfully deletes a user', function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it('fails if it receives a nonexistent user', function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });

    it('fails if it receives an invalid user', function(done) {
      getAPIToken().then(function(token) {
        done(token);
      });
    });
  });
};
