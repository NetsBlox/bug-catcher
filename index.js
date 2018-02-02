const Q = require('q');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const conditions = require('./src/conditions');
const _ = require('lodash');
const Version = require('./src/version');

class BugCollector {

    constructor() {
        this.connected = false;
    }

    connect (mongoURI="mongodb://127.0.0.1:27017/netsblox-bugs") {
        return Q.nfcall(MongoClient.connect, mongoURI)
            .then(client => {
                const db = client.db('netsblox-bugs');
                this.connected = true;
                this.client = client;
                this.bugs = db.collection('bugs');
                this.reports = db.collection('reports');
                this.projects = db.collection('projects');
                return this.client;
            });
    }

    disconnect () {
        return this.client.close(true);
    }

    hasReport (report) {
        const query = this.preprocess(report);

        return this.reports.findOne(query)
            .then(doc => !!doc);
    }

    preprocess(report) {
        // preprocess the report
        if (report.bugType === 'Client') {
            if (report.isAutoReport) {
                report.stackTrace = report.description
                    .split('Error:\n')[1].split('---')[0];

                report.error = report.stackTrace.split('\n')[0];
            } else {
                report.error = report.description;
                report.stackTrace = 'n/a';
            }
        }

        // add matching conditions
        report.conditions = [];
        for (let cond in conditions) {
            let fn = conditions[cond];
            if (fn(report)) {
                report.conditions.push(cond);
            }
        }

        return report;
    }

    ingest (report) {
        if (!this.connected) throw new Error('Not connected to a database');

        report = this.preprocess(report);
        return this.classify(report, true)
            .then(bug => {
                report.bugId = bug._id;
                return this.reports.insertOne(report)
                    .then(result => {
                        report._id = result.insertedId;
                        return this.bugs.updateOne(bug, {$inc: {reportCount: 1}})
                            .then(() => report);
                    });
            });
    }

    classify (report, canCreateNew=false) {
        // Look up a bug report for the given report
        return this.bugs.find({error: report.error}).toArray()
            .then(bugs => {
                // match all conditions
                bugs.sort((a, b) => a.conditions.length > b.conditions.length ? -1 : 1);
                for (let i = 0; i < bugs.length; i++) {
                    if (this.passesConditions(report, bugs[i].conditions)) {
                        return bugs[i];
                    }
                }
            })
            .then(bug => {
                if (bug || !canCreateNew) return bug;
                bug = {
                    error: report.error,
                    description: null,
                    reportCount: 0,
                    createdAt: new Date(),
                    conditions: []
                };
                return this.bugs.insertOne(bug)
                    .then(result => {
                        bug._id = result.insertedId;
                        return bug;
                    });
            });
    }

    ensureValidCondition (cond) {
        if (!conditions[cond]) throw new Error(`Invalid condition: ${cond}`);
    }

    passesConditions (report, conds) {
        return conds.reduce((passing, cond) => {
            return passing && conditions[cond](report);
        }, true);
    }

    updateReportCount (bugId) {
        return Q(this.reports.count({bugId: ObjectID(bugId)}))
            .then(reportCount => this.bugs.update({_id: ObjectID(bugId)}, {$set: {reportCount: reportCount}}));
    }

    split (bugId, conds) {
        if (!conds.length) throw new Error('Conditions are required for splitting bugs!');

        conds.forEach(c => this.ensureValidCondition(c));  // Ensure that the conditions are valid

        let results = null;
        return this.getReportsFor(bugId)
            .then(reports => {
                const passingReports = reports.filter(report => this.passesConditions(report, conds));
                results = {
                    matching: passingReports.length,
                    total: reports.length
                };
                if (passingReports.length) {
                    return this.getBugById(bugId)
                        .then(bug => {
                            if (passingReports.length === reports.length) {
                                return this.bugs.updateOne(bug, {conditions: bug.conditions.concat(conds)});
                            } else {
                                delete bug._id;
                                bug.reportCount = passingReports.length;
                                bug.conditions = bug.conditions.concat(conds);
                                bug.createdAt = new Date();
                                return this.bugs.insertOne(bug)
                                    .then(result => {  // assign the reports to the new bug
                                        const newBugId = result.insertedId;
                                        const query = {
                                            $or: passingReports.map(report => {
                                                return {_id: report._id};
                                            })
                                        };
                                        return this.reports.updateMany(query, {$set: {bugId: newBugId}});
                                    })
                                    .then(() => this.updateReportCount(bugId));
                            }
                        })
                }
            })
            .then(() => results);
    }

    combine (bugIds) {
        bugIds = bugIds.map(id => new ObjectID(id));
        const [remainingBugId] = bugIds;
        const removeBugIds = bugIds.slice(1);

        if (bugIds.length < 2) throw new Error('Cannot combine fewer than 2 reports!');

        // Update all the bug reports for the removeBugIds
        const query = {
            $or: removeBugIds.map(id => {
                return {bugId: id};
            })
        };
        return this.reports.updateMany(query, {$set: {bugId: remainingBugId}})
            .then(() => {  // remove all but the first id
                const oldBugs = {
                    $or: removeBugIds.map(id => {
                        return {_id: id};
                    })
                };
                return this.bugs.deleteMany(oldBugs);
            });
    }

    getReportsFor (bugId, limit) {
        return Q()
            .then(() => {
                let cursor = this.reports.find({bugId: new ObjectID(bugId)});
                if (limit) cursor = cursor.limit(limit);
                return cursor.toArray();
            });
    }

    getReportById (id) {
        return Q(this.reports.findOne({_id: new ObjectID(id)}));
    }

    getBugById (id) {
        return Q(this.bugs.findOne({_id: new ObjectID(id)}));
    }

    getBugs () {
        return Q(this.bugs.find({}).toArray());
    }

    getBugStats (bug) {
        // Statistics include:
        //   - creation time
        //   - unique users
        //   - latest netsblox version
        //   - latest bug report
        return Q(this.reports.find({bugId: new ObjectID(bug._id)}).toArray())
            .then(reports => {
                if (reports.length === 0) throw new Error(`No reports found for ${bug._id}`)
                const stats = {};
                stats.userCount = _.uniq(reports.map(report => report.user)).length;
                stats.latestVersion = reports
                    .filter(report => report.version)
                    .map(report => new Version(report.version))
                    .reduce((latest, next) => latest.max(next));
                return stats;
            });
    }

    getBugCount () {
        return Q(this.bugs.count({}));
    }
}

module.exports = BugCollector;
