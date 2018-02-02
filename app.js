const app = require('express')();
const fs = require('fs');
const path = require('path');
const rootPath = process.env.BUG_DIR || path.join(__dirname, 'raw-bugs');

const BugCollector = require('.');
const collector = new BugCollector();

app.post('/', (req, res) => {
    console.log('received bug report!');
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', function() {
        const report = JSON.parse(data);
        return collector.hasReport(report).then(exists => {
            if (exists) {
                console.error('Report already exists. Skipping ingestion...');
                res.sendStatus(200);
            } else {
                return collector.ingest(report)
                    .then(report => console.log('Report stored as', report._id))
                    .then(() => res.sendStatus(200));
            }
        })
    });
});

collector.connect()
    .then(() => app.listen(process.env.PORT));
