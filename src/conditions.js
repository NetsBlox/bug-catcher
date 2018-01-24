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

module.exports = {
    hasDeletedFailingBlock,
};
