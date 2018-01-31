const Conditions = require('../conditions');
const uaParser = require('ua-parser-js');

class Report {
    constructor(contents) {
        Object.keys(contents).forEach(key => this[key] = contents[key]);
        this.conditions = Object.keys(Conditions)
            .filter(cond => Conditions[cond](contents));
    }

    getBrowser() {
        return uaParser(this.userAgent).browser.name;
    }

    getEventsWithId(id) {
        return this.undoState.allEvents
            .filter(event => {
                const regex = new RegExp('\\b' + id + '\\b');
                return event.args.find(arg => regex.test(arg));
            });
    }
}

module.exports = Report;
