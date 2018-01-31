function hasDeletedFailingBlock(report) {
    if (!report.event)
        return console.log('report', report.id);

    const [id] = report.event.args;
    return hasBeenDeleted(report, id);
}

function hasBeenDeleted(report, id) {
    let event = report.undoState.allEvents
        .find(event => event.type === 'removeBlock' && event.args[0] === id);
    return !!event;
}

function hasUndefinedOwner(report) {
    if (!report.event) return false;
    const owner = report.event.owner;
    return owner && owner.startsWith('undefined');
}

function isCollaborating(report) {
    const editors = {};
    let usesCollaboration = false;

    if (!report.undoState) {
        console.log(report);
        return false;
    }

    report.undoState.allEvents
        .map(event => event.user)
        .reduce((prev, next) => {
            editors[prev] = true;
            if (next !== prev && editors[next]) {
                usesCollaboration = true;
            }
            return next;
        }, []);

    return usesCollaboration;
}

module.exports = {
    hasDeletedFailingBlock,
    hasUndefinedOwner,
    isCollaborating,
};
