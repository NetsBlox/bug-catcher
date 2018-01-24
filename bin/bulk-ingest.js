const fs = require('fs');
const Q = require('q');
const path = require('path');
const BugCollector = require('..');
const ProgressBar = require('progress');

const collector = new BugCollector();
const BUG_DIR = path.join(__dirname, '..', 'raw-bugs');
let reportCount = 0;
collector.connect()
    .then(() => {
        const files = fs.readdirSync(BUG_DIR);
        reportCount = files.length;
        const bar = new ProgressBar('Ingesting bug reports: :percent complete', {total: files.length})
        return files.reduce((prev, name) => {
            let report = require(`${BUG_DIR}/${name}`)
            return prev
                .then(() => collector.ingest(report))
                .then(() => bar.tick());
        }, Q());
    })
    .then(() => collector.getBugs())
    .then(bugs => {
        console.log(`Ingested ${reportCount} new bug reports.`);
        console.log(`There are now ${bugs.length} total unique bugs`);
    })
    .then(() => collector.disconnect())
    .catch(err => {
        console.error(err);
        collector.disconnect();
    })

