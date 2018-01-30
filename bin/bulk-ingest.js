const fs = require('fs');
const Q = require('q');
const path = require('path');
const BugCollector = require('..');
const ProgressBar = require('progress');

const collector = new BugCollector();
const BUG_DIR = path.resolve(process.argv[2]);
if (!process.argv[2]) {
    console.error('usage: bulk-ingest <dirname>');
    process.exit(1);
}

let reportCount = 0;
let initialBugCount = 0;
collector.connect()
    .then(() => collector.getBugCount())
    .then(count => initialBugCount = count)
    .then(() => {
        const files = fs.readdirSync(BUG_DIR);
        reportCount = files.length;
        const bar = new ProgressBar('Ingesting bug reports: :percent complete', {total: files.length})
        return files.reduce((prev, name) => {
            return prev.then(() => {
                let promise = Q();
                try {
                    let report = require(`${BUG_DIR}/${name}`)
                    promise = promise.then(() => {
                        return collector.hasReport(report)
                            .then(exists => {
                                if (exists) {
                                    return reportCount--;
                                }
                                return collector.ingest(report);
                            });
                    });
                } catch (e) {
                    reportCount--;
                    console.error(`Could not load ${name}: ${e.message}`);
                }
                if (global.gc) global.gc();
                return promise.then(() => bar.tick());
            });
        }, Q());
    })
    .then(() => collector.getBugCount())
    .then(bugCount => {
        const newBugCount = bugCount - initialBugCount;
        console.log(`Ingested ${reportCount} new bug reports.`);
        console.log(`Added ${newBugCount} new unique bugs`);
        console.log(`There are now ${bugCount} total unique bugs`);
    })
    .then(() => collector.disconnect())
    .catch(err => {
        console.error(err);
        collector.disconnect();
    })

