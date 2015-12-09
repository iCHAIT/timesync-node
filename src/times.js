'use strict';

module.exports = function(app) {
  const errors = require('./errors');
  const helpers = require('./helpers')(app);
  const validUrl = require('valid-url');
  const authPost = require('./authenticatedPost');
  const uuid = require('uuid');

  function compileTime(time) {
    return time;
  }

  app.get(app.get('version') + '/times', function(req, res) {
    const knex = app.get('knex');
    // Selects a mostly compiled list of times
    // includes duplicate entries for 'activity' field, fixed in processing.
    let timesQ = knex('times').select(
                 'users.username as user',
                 'times.duration as duration',
                 'projects.name as project',
                 'times.notes as notes',
                 'times.date_worked as date_worked',
                 'times.created_at as created_at',
                 'times.updated_at as updated_at',
                 'times.deleted_at as deleted_at',
                 'times.uuid as uuid',
                 'times.revision as revision',
                 'activities.name as activity')
                 .join('users', 'times.user', 'users.id')
                 .join('projects', 'times.project', 'projects.id')
                 .join('projectslugs', 'times.project', 'projectslugs.project')
                 .join('timesactivities', 'timesactivities.time', 'times.id')
                 .join('activities', 'timesactivities.activity',
                       'activities.id');

    // The user query param is passed
    if (req.query.user && req.query.user.length) {
      // It is a string,
      if (typeof req.query.user === 'string') {
        // append it to the timesQ query
        timesQ = timesQ.whereIn('users.username', [req.query.user]);
      // It is an array
      } else if (helpers.getType(req.query.user) === 'array' &&
                 // with string elements
                 helpers.getType(req.query.user[0]) === 'string') {
        // Append the array to the timesQ query
        timesQ = timesQ.whereIn('users.username', req.query.user);
      }
    }

    // The project param is passed
    if (req.query.project && req.query.project.length) {
      // It is a srting
      if (typeof req.query.project === 'string') {
        timesQ = timesQ.whereIn('projectslugs.name', [req.query.project]);
      // It is an array
      } else if (helpers.getType(req.query.project) === 'array' &&
                // With string elements
                helpers.getType(req.query.project[0]) === 'string') {
        // append the query to the timesQ query
        timesQ = timesQ.whereIn('projectslugs.name', req.query.project);
      }
    }

    // The activity query parameter is passed
    if (req.query.activity && req.query.activity.length) {
      // It is a string
      if (typeof req.query.activity === 'string') {
        // Append it to the timesQ query
        timesQ = timesQ.whereIn('activities.slug', [req.query.activity]);
      // It is an array
      } else if (helpers.getType(req.query.activity) === 'array' &&
                 // With string elements
                 helpers.getType(req.query.activity[0]) === 'string') {
        // Append it to the time timesQ query
        timesQ = timesQ.whereIn('activities.slug', req.query.activity);
      }
    }

    // The start or end query parameters were passed
    if (req.query.start || req.params.end) {
      let range = [];
      // The start param is a string with non-zero length
      if (helpers.getType(req.query.start) === 'string' &&
          req.query.start.length) {
        // Set it to the start element of range
        range[0] = req.query.start;
      // The multiple starts were passed
      } else if (helpers.getType(req.query.start) === 'array' &&
                 helpers.getType(req.query.start[0]) === 'string') {
        // Pick the first one passed and set it range's start element
        range[0] = req.query.start[0];
      // Set the start val to undefined and will be set to a sane default
      } else { range[0] = undefined; }

      // The start end param is a string with non-zero length
      if (helpers.getType(req.query.end) === 'string' &&
          req.query.end.length) {
        // Set range's end element to the value
        range[1] = req.query.end;
      // User passed multiple end values
      } else if (helpers.getType(req.query.end) === 'array' &&
                 helpers.getType(req.query.end[0]) === 'string') {
        // Set range's end value to the first end given
        range[1] = req.query.end[0];
      // Set to undefined to later be set to a sane value
      } else { range[1] = undefined; }

      // If the value is undefined, leave it as such
      if (range[0] === undefined) {
        // Run a regex test on the times in the query parameter
      } else if (!/\d{4}-\d{2}-\d{2}/.test(range[0])) {
        const err = errors.errorBadQueryValue('start', req.query.start);
        return res.status(err.status).send(err);
      }
      // If the value is undefined, leave it as such
      if (range[1] === undefined) {
        // Run a regex test on the times in the query parameter
      } else if (!/\d{4}-\d{2}-\d{2}/.test(range[1])) {
        const err = errors.errorBadQueryValue('end', req.query.end);
        return res.status(err.status).send(err);
      }

      // The dates must be good, so map an actual date type to them
      range = range.map(function(d) { return new Date(d).getTime(); });

      // Both end and start are specified
      if (!isNaN(range[0]) && !isNaN(range[1])) {
        // Test that the times submitted were valid within the range of
        // possible dates.
        if (!range[0] || range[0] > Date.now()) {
          const err = errors.errorBadQueryValue('start', req.query.start);
          return res.status(err.status).send(err);
        }
        if (!range[1]) {
          const err = errors.errorBadQueryValue('end', req.query.end);
          return res.status(err.status).send(err);
        }

        // Set the date worked to be within the range
        timesQ = timesQ.whereBetween('date_worked', range);
      } else {
        // One of the the processed times not NaN
        if (!isNaN(range[0])) {
          timesQ = timesQ.andWhere('date_worked', '>', range[0]);
        } else if (!isNaN(range[1])) {
          timesQ = timesQ.andWhere('date_worked', '<', range[1]);
        }
      }
    }

    if (req.params.include_revisions === '' ||
        req.params.include_revisions === 'true') {
      timesQ.then(function(times) {
        return res.send(times.map(function(time) {
          const childTime = compileTime(time);
          // Compile parents field
          return childTime;
        }));
      });
    } else {
      timesQ.then(function(times) {
        // Filter out parent objects
        let childTimes = [];
        console.log(childTimes);
        return res.send(times.map(function(time) {
          return compileTime(time);
        }));
      });
    }
  });

  app.get(app.get('version') + '/times/:uuid', function(req, res) {
    const knex = app.get('knex');
    if (!helpers.validateUUID(req.params.uuid)) {
      const err = errors.errorInvalidIdentifier('UUID', req.params.uuid);
      return res.status(err.status).send(err);
    }

    knex('times').first().where({uuid: req.params.uuid})
    .orderBy('revision', 'desc').then(function(time) {
      // get the matching time entry
      if (time) {
        time.date_worked = new Date(parseInt(time.date_worked, 10))
        .toISOString().substring(0, 10);

        time.created_at = new Date(parseInt(time.created_at, 10))
        .toISOString().substring(0, 10);

        if (time.updated_at) {
          time.updated_at = new Date(parseInt(time.updated_at, 10))
          .toISOString().substring(0, 10);
        } else {
          time.updated_at = null;
        }

        if (time.deleted_at) {
          time.deleted_at = new Date(parseInt(time.deleted_at, 10))
          .toISOString().substring(0, 10);
        } else {
          time.deleted_at = null;
        }

        knex('users').where({id: time.user}).select('username')
        .then(function(user) {
          // set its user
          time.user = user[0].username;

          knex('activities').select('slug').where('id', 'in',
          knex('timesactivities').select('activity').where({time: time.id}))
          .then(function(slugs) {
            // and get all matching timeActivities

            time.activities = [];
            for (let i = 0, len = slugs.length; i < len; i++) {
              // add a list containing all activities
              time.activities.push(slugs[i].slug);
            }

            knex('projectslugs').where({project: time.project}).select('name')
            .then(function(projectSlugs) {
              // lastly, set the project
              time.project = [];
              for (let i = 0, len = projectSlugs.length; i < len; i++) {
                time.project.push(projectSlugs[i].name);
              }

              return res.send(time);
            }).catch(function(error) {
              const err = errors.errorServerError(error);
              return res.status(err.status).send(err);
            });
          }).catch(function(error) {
            const err = errors.errorServerError(error);
            return res.status(err.status).send(err);
          });
        }).catch(function(error) {
          const err = errors.errorServerError(error);
          return res.status(err.status).send(err);
        });
      } else {
        const err = errors.errorObjectNotFound('time');
        return res.status(err.status).send(err);
      }
    }).catch(function(error) {
      const err = errors.errorServerError(error);
      return res.status(err.status).send(err);
    });
  });

  authPost(app, app.get('version') + '/times', function(req, res, user) {
    const knex = app.get('knex');
    const time = req.body.object;

    // Test existence and datatypes
    const badField = helpers.validateFields(time, [
      {name: 'duration', type: 'number', required: true},
      {name: 'project', type: 'string', required: true},
      {name: 'user', type: 'string', required: true},
      {name: 'issue_uri', type: 'string', required: false},
      {name: 'activities', type: 'array', required: true},
      {name: 'date_worked', type: 'string', required: true},
    ]);

    if (badField) {
      if (badField.actualType === 'undefined') {
        const err = errors.errorBadObjectMissingField('time',
        badField.name);
        return res.status(err.status).send(err);
      }
      const err = errors.errorBadObjectInvalidField('time',
      badField.name, badField.type, badField.actualType);
      return res.status(err.status).send(err);
    }

    // Test duration value
    if (time.duration < 0) {
      const err = errors.errorBadObjectInvalidField('time', 'duration',
      'positive number', 'negative number');
      return res.status(err.status).send(err);
    }

    // Test validity of project slug
    if (!helpers.validateSlug(time.project)) {
      const err = errors.errorBadObjectInvalidField('time', 'project', 'slug',
      'invalid slug ' + time.project);
      return res.status(err.status).send(err);
    }

    // Test each activity
    /* eslint-disable prefer-const */
    for (let activity of time.activities) {
      /* eslint-enable prefer-const */
      if (helpers.getType(activity) !== 'string') {
        const err = errors.errorBadObjectInvalidField('time', 'activities',
        'slugs', 'array containing at least 1 ' + helpers.getType(activity));
        return res.status(err.status).send(err);
      } else if (!helpers.validateSlug(activity)) {
        const err = errors.errorBadObjectInvalidField('time', 'activities',
        'slugs', 'array containing at least 1 invalid slug');
        return res.status(err.status).send(err);
      }
    }

    // Test issue URI value
    if (time.issue_uri && !validUrl.isWebUri(time.issue_uri)) {
      const err = errors.errorBadObjectInvalidField('time', 'issue_uri',
              'URI', 'invalid URI ' + time.issue_uri);
      return res.status(err.status).send(err);
    }

    // Test date worked value
    if (!/\d{4}-\d{2}-\d{2}/.test(time.date_worked) ||
    !Date.parse(time.date_worked)) {
      const err = errors.errorBadObjectInvalidField('time', 'date_worked',
      'ISO-8601 date', time.date_worked);
      return res.status(err.status).send(err);
    }

    // Finish checks for user, project, and activity
    helpers.checkUser(user.username, time.user).then(function(userId) {
      helpers.checkProject(time.project).then(function(projectId) {
        knex('userroles').where({user: userId, project: projectId})
        .then(function(roles) {
          if (roles.length === 0 || roles[0].member === false) {
            const err = errors.errorAuthorizationFailure(user.username,
              'create time entries for project ' + time.project + '.');
            return res.status(err.status).send(err);
          }
          helpers.checkActivities(time.activities)
          .then(function(activityIds) {
            time.uuid = uuid.v4();
            time.revision = 1;
            const insertion = {
              duration: time.duration,
              user: userId,
              project: projectId,
              notes: time.notes,
              issue_uri: time.issue_uri,
              date_worked: new Date(time.date_worked).getTime(),
              created_at: Date.now(),
              uuid: time.uuid,
              revision: 1,
            };

            knex.transaction(function(trx) {
              // trx can be used just like knex, but every call is temporary
              // until trx.commit() is called. Until then, they're stored
              // separately, and, if something goes wrong, can be rolled back
              // without side effects.
              trx('times').insert(insertion).returning('id')
              .then(function(timeIds) {
                const timeId = timeIds[0];

                const taInsertion = [];
                /* eslint-disable prefer-const */
                for (let activityId of activityIds) {
                  /* eslint-enable prefer-const */
                  taInsertion.push({
                    time: timeId,
                    activity: activityId,
                  });
                }

                trx('timesactivities').insert(taInsertion).then(function() {
                  time.id = timeId;
                  return res.send(JSON.stringify(time));
                }).catch(function(error) {
                  trx.rollback();
                  const err = errors.errorServerError(error);
                  return res.status(err.status).send(err);
                });
              }).catch(function(error) {
                trx.rollback();
                const err = errors.errorServerError(error);
                return res.status(err.status).send(err);
              });
            }).catch(function(error) {
              const err = errors.errorServerError(error);
              return res.status(err.status).send(err);
            });
          }).catch(function() {
            const err = errors.errorInvalidForeignKey('time', 'activities');
            return res.status(err.status).send(err);
          });
        }).catch(function(error) {
          const err = errors.errorServerError(error);
          return res.status(err.status).send(err);
        });
      }).catch(function() {
        const err = errors.errorInvalidForeignKey('time', 'project');
        return res.status(err.status).send(err);
      });
    }).catch(function() {
      const err = errors.errorAuthorizationFailure(user.username,
        'create time entries for ' + time.user);
      return res.status(err.status).send(err);
    });
  });

  // Patch times
  authPost(app, app.get('version') + '/times/:uuid', function(req, res, user) {
    const knex = app.get('knex');
    if (!helpers.validateUUID(req.params.uuid)) {
      const err = errors.errorInvalidIdentifier('UUID', req.params.uuid);
      return res.status(err.status).send(err);
    }

    const obj = req.body.object;

    // Test duration value
    if (obj.duration !== undefined &&
            helpers.getType(obj.duration) === 'object') {
      const err = errors.errorBadObjectInvalidField('time', 'duration',
      'number', 'object');
      return res.status(err.status).send(err);
    }

    // Duration always ends up a string for some reason
    if (obj.duration !== undefined) {
      obj.duration = Number(obj.duration);
    }

    // Test existence and datatypes
    const fields = [
      {name: 'duration', type: 'number', required: false},
      {name: 'project', type: 'string', required: false},
      {name: 'activities', type: 'array', required: false},
      {name: 'user', type: 'string', required: false},
      {name: 'issue_uri', type: 'string', required: false},
      {name: 'date_worked', type: 'string', required: false},
      {name: 'notes', type: 'string', required: false},
    ];

    const fieldNames = fields.map(function(field) {
      return field.name;
    });

    /* eslint-disable prefer-const */
    for (let field in obj) {
    /* eslint-enable prefer-const */
      if (fieldNames.indexOf(field) < 0) {
        const err = errors.errorBadObjectUnknownField('time', field);
        return res.status(err.status).send(err);
      }
    }

    // Test fields
    const validationFailure = helpers.validateFields(obj, fields);
    if (validationFailure) {
      const err = errors.errorBadObjectInvalidField('time',
        validationFailure.name, validationFailure.type,
        validationFailure.actualType);
      return res.status(err.status).send(err);
    }

    // Test duration value again
    if (obj.duration !== undefined && obj.duration < 0) {
      const err = errors.errorBadObjectInvalidField('time', 'duration',
      'positive integer', 'negative integer');
      return res.status(err.status).send(err);
    }

    // Test each activity
    if (obj.activities !== undefined) {
      /* eslint-disable prefer-const */
      for (let activity of obj.activities) {
        /* eslint-enable prefer-const */
        if (helpers.getType(activity) !== 'string') {
          const err = errors.errorBadObjectInvalidField('time', 'activities',
          'slugs', 'array containing at least 1 ' +
          helpers.getType(activity));
          return res.status(err.status).send(err);
        } else if (!helpers.validateSlug(activity)) {
          const err = errors.errorBadObjectInvalidField('time', 'activities',
          'slugs', 'array containing at least 1 invalid slug');
          return res.status(err.status).send(err);
        }
      }
    }

    // Test issue URI value
    if (obj.issue_uri !== undefined &&
            !validUrl.isWebUri(obj.issue_uri)) {
      const err = errors.errorBadObjectInvalidField('time', 'issue_uri',
              'URI', 'invalid URI ' + obj.issue_uri);
      return res.status(err.status).send(err);
    }

    // Test date worked value
    if (obj.date_worked !== undefined &&
        (!/\d{4}-\d{2}-\d{2}/.test(obj.date_worked) ||
        !Date.parse(obj.date_worked))) {
      const err = errors.errorBadObjectInvalidField('time', 'date_worked',
      'ISO-8601 date', obj.date_worked);
      return res.status(err.status).send(err);
    }

    // Test notes value
    if (obj.notes !== undefined && helpers.getType(obj.notes) !== 'string') {
      const err = errors.errorBadObjectInvalidField('time', 'notes',
      'string', helpers.getType(obj.notes));
      return res.status(err.status).send(err);
    }

    // retrieves the time from the database
    knex('times').select('times.duration as duration', 'times.user as user',
            'times.project as project', 'times.notes as notes',
            'times.issue_uri as issue_uri',
            'times.date_worked as date_worked',
            'times.created_at as created_at',
            'times.updated_at as updated_at', 'times.id as id',
            'times.uuid as uuid', 'times.revision as revision',
            'users.username as owner', 'projectslugs.name as projectName')
    .where('times.uuid', '=', req.params.uuid).innerJoin('users', 'users.id',
                'times.user').innerJoin('projectslugs', 'projectslugs.id',
                'times.project')
    .orderBy('times.revision', 'desc')
    .then(function(time) {
      if (user.username !== time[0].owner) {
        const err = errors.errorAuthorizationFailure(user.username,
          'create objects for ' + time[0].owner);
        return res.status(err.status).send(err);
      }

      const username = obj.user || time[0].owner;
      helpers.checkUser(username, username).then(function(userId) {
        if (userId !== undefined) {
          time[0].user = userId;
        } else {
          time[0].user = time[0].user;
        }

        const projectName = obj.project || time[0].projectName;
        helpers.checkProject(projectName).then(function(projectId) {
          time[0].project = projectId || time[0].project;
          time[0].duration = obj.duration || time[0].duration;
          time[0].notes = obj.notes || time[0].notes;
          time[0].issue_uri = obj.issue_uri || time[0].issue_uri;
          // created_at is returned as string by postgres
          time[0].created_at = parseInt(time[0].created_at, 10);
          time[0].updated_at = Date.now();
          time[0].revision += 1;
          delete time[0].owner;
          delete time[0].projectName;

          if (obj.date_worked) {
            time[0].date_worked = Date.parse(obj.date_worked);
          } else {
            time[0].date_worked = parseInt(time[0].date_worked, 10);
          }

          const oldId = time[0].id;
          delete time[0].id;

          const activityList = obj.activities || [];
          helpers.checkActivities(activityList).then(function(activityIds) {
            knex.transaction(function(trx) {
              // trx can be used just like knex, but every call is temporary
              // until trx.commit() is called. Until then, they're stored
              // separately, and, if something goes wrong, can be rolled back
              // without side effects.

              trx('times').insert(time[0]).returning('id').then(function(id) {
                time[0].id = id[0];

                if (helpers.getType(obj.activities) !== 'array' ||
                obj.activities.length) {
                  if (!obj.activities) {
                    trx('timesactivities').select('activity')
                    .where('time', oldId).then(function(activities) {
                      const taInsertion = [];
                      /* eslint-disable prefer-const */
                      for (let activity of activities) {
                        /* eslint-enable prefer-const */
                        taInsertion.push({
                          time: time[0].id,
                          activity: activity.activity,
                        });
                      }

                      trx('timesactivities').insert(taInsertion)
                      .then(function() {
                        trx.commit();
                        return res.send(time);
                      }).catch(function(error) {
                        trx.rollback();
                        const err = errors.errorServerError(error);
                        return res.status(err.status).send(err);
                      });
                    }).catch(function(error) {
                      const err = errors.errorServerError(error);
                      return res.status(err.status).send(err);
                    });
                  } else {
                    const taInsertion = [];
                    /* eslint-disable prefer-const */
                    for (let activity of activityIds) {
                      /* eslint-enable prefer-const */
                      taInsertion.push({
                        time: time[0].id,
                        activity: activity,
                      });
                    }

                    trx('timesactivities').insert(taInsertion)
                    .then(function() {
                      return res.send(time);
                    }).catch(function(error) {
                      trx.rollback();
                      const err = errors.errorServerError(error);
                      return res.status(err.status).send(err);
                    });
                  }
                } else {
                  return res.send(time);
                }
              }).catch(function(error) {
                trx.rollback();
                const err = errors.errorServerError(error);
                return res.status(err.status).send(err);
              });
            }).catch(function(error) {
              const err = errors.errorServerError(error);
              return res.status(err.status).send(err);
            });
          }).catch(function() {
            const err = errors.errorInvalidForeignKey('time',
                    'activities');
            return res.status(err.status).send(err);
          });
        }).catch(function() {
          const err = errors.errorInvalidForeignKey('time', 'project');
          return res.status(err.status).send(err);
        });
      }).catch(function() {
        const err = errors.errorInvalidForeignKey('time', 'user');
        return res.status(err.status).send(err);
      });
    }).catch(function(error) {
      const err = errors.errorServerError(error);
      return res.status(err.status).send(err);
    });
  });
};
