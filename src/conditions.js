function hasDeletedFailingBlock(report) {
    if (!report.event) return false;

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
    if (!report.undoState) return false;

    const editors = {};
    let usesCollaboration = false;

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

function hasResetActionIds(report) {
    const events = report.undoState.allEvents;

    for (let i = 1; i < events.length; i++) {
        if (events[i].id === 0) {
            return true;
        }
    }
    return false;
}

module.exports = {
    hasDeletedFailingBlock,
    hasUndefinedOwner,
    isCollaborating,
    hasResetActionIds,
};
