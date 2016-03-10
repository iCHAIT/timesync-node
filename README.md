TimeSync-Node
==============

![travis](https://travis-ci.org/osuosl/timesync-node.svg?branch=develop) [![Dependency Status](https://david-dm.org/osuosl/timesync-node.svg)](https://david-dm.org/osuosl/timesync-node)

<img align="right" style="padding: 5px;" src="/timesync-node.png?raw=true" />

TimeSync is the OSU Open Source Lab's time tracking system. It's designed to be
simple, have a sane API, and make sense while allowing users to track their
time spent on various projects and activities.

Usage
-----

To start a local instance running on port 8000, just run:

```
$ npm install
$ SECRET_KEY=secret INSTANCE_NAME=timesync-local npm run devel
```

``npm run devel`` is a convenience that will automatically restart the server
every time source files are changed. The standard ``npm start`` still works,
and will not restart the server automatically.

The ``SECRET_KEY`` and ``INSTANCE_NAME`` environment variables are used for
the authentication service: ``INSTANCE_NAME`` is used to uniquely identify a
running instance of timesync, to prevent cross-authentication, and
``SECRET_KEY`` is used as a cryptographic key for the token signing function
(see [the docs](https://github.com/osuosl/timesync) for more details).

For this reason, it is important that in production, SECRET_KEY is set to a
secure key which cannot be guessed, and INSTANCE_NAME is set to a unique name
which can identify your instance.

To run the test suite and linter run:

```
$ npm test
$ npm run linter
```

Alternately, run:

```
$ npm run latte
```

Which will run ``npm run linter`` followed by ``npm run coverage`` (which runs
the tests and then prints test coverage results).

To run a subset of the tests:

```
$ npm test -- -g <substring of test description>
$ npm test -- -g POST   # Runs all tests with POST in the `describe` or `it` strings
```

To make a quick request on the dev instance, first run the database migrations
and load the fixtures:

```
$ npm run migrations
$ npm run fixtures
```

Next, run the application:

```
$ SECRET_KEY=secret INSTANCE_NAME=timesync-local npm start
```

Then, in another terminal, make a request to the application with curl.

If you have a user instance already, then simply first authenticate (angle
brackets indicate user input):

```
$ curl -XPOST -d '{"auth":{"type":"password","user":"<username>","password":"<pass>"}}' -H "Content-Type: application/json" http://localhost:8000/v1/login
```

This will print out a long JWT token, which you can then place into the data on
your curl request:
(*Piping it to python makes the output pretty.*)

```
$ curl -XGET -s localhost:8000/v1/times?token=<token> | python -m json.tool
[
    {
        "activity": [
            "dev"
        ],
        "created_at": null,
        "date_worked": null,
        "duration": 12,
        "id": 1,
        "issue_uri": "https://github.com/osu-cass/whats-fresh-api/issues/56",
        "notes": "",
        "project": [
            "wf"
        ],
        "updated_at": null,
        "user": "tschuy"
    }
]

```

Your output should look something like the above.

Database Backends
-----------------

TimeSync Node supports a development ``sqlite`` backend and a production
``postgres`` backend. The default development and testing environment uses
``sqlite``; to use Postgres, see the development documentation.

To run migrations on a particular backend, run:

```
$ NODE_ENV=backend npm run migrations
```

Documentation
-------------

More in-depth documentation can be found inside the ``docs/`` folder. To build
the docs, build them with sphinxdocs by running the following:

```
$ pip install -r requirements.txt
$ cd docs
[docs]$ make html
[docs]$ <browser> build/html/index.html
```

API Specification
------------------

The API docs are a git submodule. Before building them you need to initialize
the submodule with the following commands:

```
The following command initializes the empty submodule:
$ git submodule update --init timesync-api
The following command updates the submodule (when the remote repo gets updated):
$ git submodule update timesync-api
```

To build the api specification docs run the following commands (it is very
similar to building the timesync-node docs):

```
$ pip install -r requirements.txt
$ cd timesync-api
[timesync-api]$ make html
[timesync-api]$ <browser> build/html/index.html
```

Authentication
--------------

Initial authentication is handled with a number of "modules", including simple
password-based, LDAP, and possibly more in the future. To use an authentication
module, set the environment variable ``TIMESYNC_AUTH_MODULES`` to a JSON list
containing the plugin names you wish to enable. If the variable is not set,
TimeSync will default to allowing all forms. Note that some types of
authentication may require additional settings (see below).

If the ``TIMESYNC_AUTH_MODULES`` variable is empty, all supported forms of
authentication will be enabled as a default. Invalid module names are ignored.

**Possible options**:
  * ``password`` for simple password-based authentication
  * ``ldap`` for LDAP-based authentication

ex: to enable only LDAP authentication, set ``TIMESYNC_AUTH_MODULES`` to
``["ldap"]``. To enable both local password and LDAP, set it to
``["password","ldap"]``. Order does not matter.

To use LDAP authentication, there are two additional environment variables that
need to be set:

1. ``TIMESYNC_LDAP_URL``: the URL of the LDAP server to connect to, ex.
  ``ldaps://ldap.osuosl.org``.
2. ``TIMESYNC_LDAP_SEARCH_BASE``: the search parameter used to find users,
  ex. ``ou=People,dc=osuosl,dc=org``

Note that this is only authentication on the ``/login`` endpoint. All other
endpoints use only token authentication. To use token authentication, first
POST to ``/login`` using any of the above supported forms of authentication.
This will return a JWT token which you can then use to uniquely identify
yourself for up to 30 minutes.

Use the token as a query parameter on GET requests (e.g. ``GET
http://localhost:8000/v1/times?token=_token_``) and in the ``auth`` block on
POST requests:

```
POST http://localhost:8000/v1/projects
{
  "auth": {
    "type": "token",
    "token": "_token_"
  },
  "object": {
    ...
  }
}
```
